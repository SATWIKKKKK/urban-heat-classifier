import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

/**
 * POST-GOOGLE-AUTH REDIRECT
 * This route is used as the callbackUrl for Google OAuth sign-in.
 * It reads the session from the JWT and redirects to the correct dashboard,
 * ensuring new CITY_ADMIN users always land on the onboarding page.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { role, onboardingComplete } = session.user;

  const roleRedirects: Record<string, string> = {
    SUPER_ADMIN: '/dashboard/admin',
    CITY_ADMIN: onboardingComplete ? '/dashboard/map' : '/dashboard/onboarding',
    URBAN_PLANNER: onboardingComplete ? '/dashboard/map' : '/dashboard/waiting',
    CITY_COUNCIL: '/dashboard/scenarios',
    MUNICIPAL_COMMISSIONER: '/dashboard/commissioner',
    WARD_OFFICER: '/dashboard/ward',
    SDMA_OBSERVER: '/dashboard/state',
    NGO_FIELD_WORKER: '/dashboard/field',
    DATA_ANALYST: '/dashboard/analyst',
    CITIZEN_REPORTER: '/dashboard/citizen',
  };

  redirect(roleRedirects[role] ?? '/dashboard');
}
