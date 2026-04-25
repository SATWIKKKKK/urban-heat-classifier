import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import prisma from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

function slugifyCityName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function createUniqueCitySlug(baseName: string) {
  const baseSlug = slugifyCityName(baseName) || 'city';
  let slug = baseSlug;
  let attempt = 1;

  while (await prisma.city.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    /*
      GOOGLE CLOUD CONSOLE CONFIGURATION:
      The OAuth client must have these exact URIs:
      
      Authorized JavaScript origins:
        http://localhost:3000
        
      Authorized redirect URIs:
        http://localhost:3000/api/auth/callback/google
        
      If these are wrong in Google Cloud Console, OAuth will fail with redirect_uri_mismatch error.
    */
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { city: { include: { onboardingState: true } } },
        });

        if (!user) {
          throw new Error('Invalid credentials');
        }

        if (user.isLocked) {
          if (user.lockedUntil && new Date() < user.lockedUntil) {
            const minutes = Math.ceil(
              (user.lockedUntil.getTime() - Date.now()) / 60000
            );
            throw new Error(`Account locked. Try again in ${minutes} minutes.`);
          }
          // Lock expired, reset
          await prisma.user.update({
            where: { id: user.id },
            data: { isLocked: false, failedLogins: 0, lockedUntil: null },
          });
        }

        if (!user.passwordHash) {
          throw new Error(
            'This email uses Google login. Please sign in with Google.'
          );
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          const failedLogins = user.failedLogins + 1;
          if (failedLogins >= 5) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLogins,
                isLocked: true,
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
              },
            });
            throw new Error('Account locked for 30 minutes');
          }
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLogins },
          });
          throw new Error('Invalid credentials');
        }

        // Reset failed logins on success
        await prisma.user.update({
          where: { id: user.id },
          data: { failedLogins: 0, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          cityId: user.cityId,
          onboardingComplete: user.city?.onboardingState?.isComplete ?? false,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const email = user.email;
          if (!email) return false;

          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            await prisma.user.update({
              where: { email },
              data: { lastLoginAt: new Date() },
            });
            return true;
          }

          // New Google user — create WITHOUT role assignment.
          // Role will be chosen on the /select-role page.
          await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split('@')[0],
              passwordHash: null,
              lastLoginAt: new Date(),
              role: 'PUBLIC',
            },
          });

          return true;
        } catch (error) {
          console.error('Google signIn error:', error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // ── Re-fetch role when session is explicitly updated (e.g. after /select-role) ──
      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, cityId: true },
        });
        if (dbUser) {
          const role = dbUser.role;
          if (role === 'CITY_ADMIN' || role === 'RESIDENT') {
            token.role = role;
            token.cityId = dbUser.cityId ?? undefined;
            token.needsRoleSelection = false;
          } else {
            token.needsRoleSelection = true;
          }
        }
        return token;
      }

      if (user) {
        // ── First sign-in: resolve DB user and set role in token ──────────
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, cityId: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            const role = dbUser.role;
            if (role === 'CITY_ADMIN' || role === 'RESIDENT') {
              token.role = role;
              token.cityId = dbUser.cityId ?? undefined;
              token.needsRoleSelection = false;
            } else {
              // New Google user with PUBLIC role — needs role selection
              token.needsRoleSelection = true;
            }
          }
        } else {
          // Credentials login
          token.sub = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, cityId: true },
          });
          if (dbUser) {
            const role = dbUser.role;
            if (role === 'CITY_ADMIN' || role === 'RESIDENT') {
              token.role = role;
              token.cityId = dbUser.cityId ?? undefined;
              token.needsRoleSelection = false;
            } else {
              // Legacy role — default to CITY_ADMIN
              console.warn('Legacy role detected, defaulting to CITY_ADMIN for user:', user.id);
              token.role = 'CITY_ADMIN';
              token.needsRoleSelection = false;
            }
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string) ?? 'CITY_ADMIN';
        session.user.cityId = (token.cityId as string) ?? undefined;
        session.user.onboardingComplete = false;
        (session.user as { needsRoleSelection?: boolean }).needsRoleSelection =
          (token.needsRoleSelection as boolean) ?? false;
      }
      return session;
    },

    authorized: authConfig.callbacks?.authorized,
  },
  pages: {
    signIn: '/login',
    error: '/auth-error',
  },
});

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
  console.warn('NEXTAUTH_URL is not set in production. OAuth callbacks may fail.');
}
