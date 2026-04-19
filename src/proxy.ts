import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/admin': ['SUPER_ADMIN'],
  '/dashboard/data': ['CITY_ADMIN', 'SUPER_ADMIN', 'DATA_ANALYST'],
  '/dashboard/reports/generate': ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'],
  '/dashboard/scenarios': ['CITY_COUNCIL', 'URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER'],
  '/dashboard/reports': ['CITY_COUNCIL', 'URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN', 'MUNICIPAL_COMMISSIONER', 'SDMA_OBSERVER'],
  '/dashboard/commissioner': ['MUNICIPAL_COMMISSIONER', 'SUPER_ADMIN'],
  '/dashboard/ward': ['WARD_OFFICER', 'MUNICIPAL_COMMISSIONER', 'SUPER_ADMIN'],
  '/dashboard/state': ['SDMA_OBSERVER', 'SUPER_ADMIN'],
  '/dashboard/field': ['NGO_FIELD_WORKER', 'SUPER_ADMIN'],
  '/dashboard/citizen': ['CITIZEN_REPORTER', 'SUPER_ADMIN'],
  '/dashboard/analyst': ['DATA_ANALYST', 'CITY_ADMIN', 'SUPER_ADMIN'],
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
  const session = req.auth;

  // Redirect authenticated users from landing page to dashboard
  if (pathname === '/' && session?.user) {
    const role = session.user.role;
    const redirectMap: Record<string, string> = {
      SUPER_ADMIN: '/dashboard/admin',
      CITY_ADMIN: '/dashboard/map',
      URBAN_PLANNER: '/dashboard/map',
      CITY_COUNCIL: '/dashboard/scenarios',
      MUNICIPAL_COMMISSIONER: '/dashboard/commissioner',
      WARD_OFFICER: '/dashboard/ward',
      SDMA_OBSERVER: '/dashboard/state',
      NGO_FIELD_WORKER: '/dashboard/field',
      DATA_ANALYST: '/dashboard/analyst',
      CITIZEN_REPORTER: '/dashboard/citizen',
    };
    return NextResponse.redirect(new URL(redirectMap[role] || '/dashboard', req.url));
  }

  const isPublicRoute =
    pathname === '/' ||
    PUBLIC_ROUTES
      .filter((route) => route !== '/')
      .some((route) => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
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

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect old my-data route to mydata
    if (pathname === '/dashboard/my-data') {
      return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
    }

    const role = session.user.role;
    const onboardingComplete = session.user.onboardingComplete;
    const cityId = session.user.cityId;

    // SUPER_ADMIN bypasses all checks
    if (role === 'SUPER_ADMIN') {
      return NextResponse.next();
    }

    // No city → must onboard
    if (!cityId && !pathname.startsWith('/dashboard/onboarding')) {
      return NextResponse.redirect(new URL('/dashboard/onboarding', req.url));
    }

    // Not onboarding complete → must onboard
    if (!onboardingComplete && !pathname.startsWith('/dashboard/onboarding') && !pathname.startsWith('/dashboard/waiting')) {
      return NextResponse.redirect(new URL('/dashboard/onboarding', req.url));
    }

    // Onboarding complete → redirect away from onboarding
    if (onboardingComplete && pathname.startsWith('/dashboard/onboarding')) {
      return NextResponse.redirect(new URL('/dashboard/mydata', req.url));
    }

    // Default dashboard redirect by role
    if (pathname === '/dashboard') {
      const roleDefaultRoute: Record<string, string> = {
        CITY_ADMIN: '/dashboard/mydata',
        URBAN_PLANNER: '/dashboard/mydata',
        CITY_COUNCIL: '/dashboard/scenarios',
        MUNICIPAL_COMMISSIONER: '/dashboard/commissioner',
        WARD_OFFICER: '/dashboard/ward',
        SDMA_OBSERVER: '/dashboard/state',
        NGO_FIELD_WORKER: '/dashboard/field',
        DATA_ANALYST: '/dashboard/analyst',
        CITIZEN_REPORTER: '/dashboard/citizen',
      };
      return NextResponse.redirect(new URL(roleDefaultRoute[role] || '/dashboard/mydata', req.url));
    }

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
