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
              data: { lastLoginAt: new Date() }
            });
            return true;
          }
          
          const newUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split('@')[0],
              passwordHash: null,
              lastLoginAt: new Date(),
            }
          });
          
          const cityName = `${user.name ?? 'My'}'s City`;
          const city = await prisma.city.create({
            data: {
              name: cityName,
              slug: cityName.toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .substring(0, 50) + '-' + Date.now(),
              country: 'India',
              currency: 'INR',
            }
          });
          
          // Update user with role and cityId since UserRole model doesn't exist
          await prisma.user.update({
            where: { id: newUser.id },
            data: {
              role: 'CITY_ADMIN',
              cityId: city.id,
            }
          });
          
          await prisma.onboardingState.create({
            data: {
              cityId: city.id,
              isComplete: true,
            }
          });
          
          return true;
        } catch (error) {
          console.error('Google signIn error:', error);
          return false;
        }
      }
      return true;
    },
    
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string;
        
        // Fetch user role and city from DB on every session check
        const userFromDb = await prisma.user.findUnique({
          where: { id: token.sub as string },
          select: {
            role: true,
            cityId: true,
            city: {
              select: {
                onboardingState: {
                  select: { isComplete: true }
                }
              }
            }
          }
        });
        
        if (userFromDb) {
          session.user.role = userFromDb.role;
          session.user.cityId = userFromDb.cityId ?? undefined;
          session.user.onboardingComplete = userFromDb.city?.onboardingState?.isComplete ?? false;
        }
      }
      return session;
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google') {
          // For Google, the 'user.id' is the Google ID. 
          // We need our database ID for the 'sub'.
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true }
          });
          if (dbUser) {
            token.sub = dbUser.id;
          }
        } else {
          token.sub = user.id;
        }
      }
      return token;
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
