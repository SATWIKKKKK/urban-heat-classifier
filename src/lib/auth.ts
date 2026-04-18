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
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
        const email = user.email?.toLowerCase().trim();
        if (!email) {
          return false;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
          include: { city: { include: { onboardingState: true } } },
        });

        if (existingUser) {
          if (existingUser.passwordHash) {
            return `/login?error=${encodeURIComponent(
              'This email uses password login. Please sign in with your email and password.'
            )}`;
          }

          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          });

          return true;
        }

        const displayName = user.name?.trim() || email.split('@')[0];
        const firstName = displayName.split(' ')[0] || 'New';
        const cityName = `${firstName}'s City`;
        const slug = await createUniqueCitySlug(cityName);

        await prisma.$transaction(async (tx) => {
          const city = await tx.city.create({
            data: {
              name: cityName,
              slug,
            },
          });

          const createdUser = await tx.user.create({
            data: {
              email,
              name: displayName,
              image: user.image,
              cityId: city.id,
              role: 'CITY_ADMIN',
              lastLoginAt: new Date(),
            },
          });

          await tx.onboardingState.create({
            data: {
              cityId: city.id,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: createdUser.id,
              action: 'USER_REGISTERED_GOOGLE',
              resourceType: 'User',
              resourceId: createdUser.id,
              afterValue: JSON.stringify({ email, role: 'CITY_ADMIN', cityName }),
            },
          });
        });
      }

      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.role = (user as typeof user & { role?: string }).role;
        token.cityId = (user as typeof user & { cityId?: string | null }).cityId ?? null;
        token.userId = user.id;
        token.onboardingComplete =
          (user as typeof user & { onboardingComplete?: boolean }).onboardingComplete ?? false;
      }

      if (account?.provider === 'google' || (!token.userId && token.email)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email ?? undefined },
          include: { city: { include: { onboardingState: true } } },
        });

        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.cityId = dbUser.cityId;
          token.onboardingComplete = dbUser.city?.onboardingState?.isComplete ?? false;
        }
      }

      if (trigger === 'update' && session) {
        token.role = session.role || token.role;
        token.cityId = session.cityId || token.cityId;
        token.onboardingComplete =
          session.onboardingComplete ?? token.onboardingComplete;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.cityId = token.cityId as string | null;
        session.user.onboardingComplete =
          (token.onboardingComplete as boolean | undefined) ?? false;
      }

      return session;
    },
    authorized: authConfig.callbacks?.authorized,
  },
});
