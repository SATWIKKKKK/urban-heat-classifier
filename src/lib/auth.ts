import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import prisma from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

function getCanonicalAuthUrl() {
  const vercelHost =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;

  if (!vercelHost) {
    return process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  }

  return `https://${vercelHost}`;
}

const canonicalAuthUrl = getCanonicalAuthUrl();

if (canonicalAuthUrl) {
  process.env.AUTH_URL = canonicalAuthUrl;
  process.env.NEXTAUTH_URL = canonicalAuthUrl;
}

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

async function ensureCityAdminForUser(userId: string, preferredCityName?: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { cityId: true },
  });

  let cityId = existing?.cityId ?? null;

  if (!cityId) {
    const cityName = preferredCityName?.trim() || 'My City';
    const citySlug = await createUniqueCitySlug(cityName);
    const city = await prisma.city.create({
      data: {
        name: cityName,
        slug: citySlug,
        country: 'India',
        currency: 'INR',
      },
    });
    cityId = city.id;

    await prisma.onboardingState.upsert({
      where: { cityId },
      create: { cityId, isComplete: true },
      update: { isComplete: true },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role: 'CITY_ADMIN', cityId },
  });

  return cityId;
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
          cityId: user.cityId ?? undefined,
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
            await ensureCityAdminForUser(
              existingUser.id,
              existingUser.name ? `${existingUser.name.split(' ')[0]}'s City` : undefined
            );
            await prisma.user.update({
              where: { email },
              data: { lastLoginAt: new Date() },
            });
            return true;
          }

          const cityName = user.name ? `${user.name.split(' ')[0]}'s City` : 'My City';
          const citySlug = await createUniqueCitySlug(cityName);
          const city = await prisma.city.create({
            data: {
              name: cityName,
              slug: citySlug,
              country: 'India',
              currency: 'INR',
            },
          });

          await prisma.onboardingState.create({
            data: {
              cityId: city.id,
              isComplete: true,
            },
          });

          await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split('@')[0],
              passwordHash: null,
              lastLoginAt: new Date(),
              role: 'CITY_ADMIN',
              cityId: city.id,
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
      if (trigger === 'update' && token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: { role: true, cityId: true },
        });
        if (dbUser) {
          token.role = dbUser.role || 'CITY_ADMIN';
          token.cityId = dbUser.cityId ?? undefined;
        }
        return token;
      }

      if (user) {
        if (account?.provider === 'google') {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, cityId: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role || 'CITY_ADMIN';
            token.cityId = dbUser.cityId ?? undefined;
          }
        } else {
          const userId = user.id;
          if (!userId) {
            return token;
          }

          token.sub = userId;
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, cityId: true },
          });
          if (dbUser) {
            token.role = dbUser.role || 'CITY_ADMIN';
            token.cityId = dbUser.cityId ?? undefined;
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

if (process.env.NODE_ENV === 'production' && !canonicalAuthUrl) {
  console.warn('Auth base URL could not be resolved in production. OAuth callbacks may fail.');
}
