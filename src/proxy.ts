import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith('/resident')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard/map', req.url));
  }

  // Legacy routes removed from the product flow.
  if (pathname === '/select-role' || pathname.startsWith('/dashboard/resident')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.redirect(new URL('/dashboard/map', req.url));
  }

  // ── Dashboard routes ─────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect /dashboard to default landing page
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard/map', req.url));
    }

    // Redirect legacy /dashboard/my-data
    if (pathname === '/dashboard/my-data') {
      return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
    }

    // Page-level role checks remain responsible for authorization.
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/select-role', '/resident/:path*'],
};
