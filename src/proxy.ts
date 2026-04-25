import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── /select-role: accessible to any logged-in user ──────────────────────
  if (pathname === '/select-role') {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  // ── Dashboard routes ─────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.user.role as string;
    const needsRoleSelection = (session.user as { needsRoleSelection?: boolean }).needsRoleSelection;

    // Redirect to role selection if no role assigned yet
    if (needsRoleSelection) {
      return NextResponse.redirect(new URL('/select-role', req.url));
    }

    // Redirect /dashboard to role default
    if (pathname === '/dashboard') {
      if (role === 'RESIDENT') {
        return NextResponse.redirect(new URL('/dashboard/resident', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
    }

    // Redirect legacy /dashboard/my-data
    if (pathname === '/dashboard/my-data') {
      return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
    }

    // RESIDENT paths — only RESIDENT can access
    if (pathname.startsWith('/dashboard/resident')) {
      if (role !== 'RESIDENT') {
        return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
      }
      return NextResponse.next();
    }

    // CITY_ADMIN paths — only CITY_ADMIN can access
    const cityAdminPaths = [
      '/dashboard/mydata',
      '/dashboard/map',
      '/dashboard/scenarios',
      '/dashboard/reports',
      '/dashboard/places',
      '/dashboard/interventions',
      '/dashboard/settings',
    ];

    const isCityAdminPath = cityAdminPaths.some((p) => pathname.startsWith(p));
    if (isCityAdminPath && role !== 'CITY_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/resident', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*', '/select-role'],
};
