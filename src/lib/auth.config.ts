import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config — no Node.js-only imports (no Prisma/bcryptjs).
 * Used by middleware to validate JWT sessions.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Used by middleware — just checks JWT presence
      return !!auth?.user;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.cityId = (user as any).cityId;
        token.userId = user.id;
      }
      if (trigger === 'update' && session) {
        token.role = session.role || token.role;
        token.cityId = session.cityId || token.cityId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.cityId = token.cityId as string | null;
      }
      return session;
    },
  },
};
