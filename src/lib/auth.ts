import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import prisma from '@/lib/db';
import { authConfig } from '@/lib/auth.config';

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
          include: { city: true },
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
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { accounts: true },
        });

        if (existingUser) {
          // Check if existing user uses password auth
          if (existingUser.passwordHash && !existingUser.accounts?.length) {
            return false;
          }
          // Update last login
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { lastLoginAt: new Date() },
          });
        }
      }
      return true;
    },
    ...authConfig.callbacks,
  },
});
