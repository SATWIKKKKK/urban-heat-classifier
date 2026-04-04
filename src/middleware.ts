import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/admin': ['SUPER_ADMIN'],
  '/dashboard/data': ['CITY_ADMIN', 'SUPER_ADMIN'],
  '/dashboard/reports/generate': ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
};

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/map',
  '/api/auth',
  '/api/public',
  '/',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and API routes for auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const session = req.auth;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = session.user.role;

    // Check role-based route access
    for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Scenario approve requires CITY_ADMIN+
    if (pathname.match(/\/dashboard\/scenarios\/.*\/approve/)) {
      if (!['CITY_ADMIN', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // CITY_COUNCIL restricted routes
    if (role === 'CITY_COUNCIL') {
      const allowedForCouncil = [
        '/dashboard/scenarios',
        '/dashboard/reports',
        '/dashboard/map',
      ];
      if (!allowedForCouncil.some((r) => pathname.startsWith(r))) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
