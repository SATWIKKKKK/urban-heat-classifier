import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role === 'SUPER_ADMIN') {
    redirect('/dashboard/admin');
  }

  if (session.user.role === 'CITY_COUNCIL') {
    redirect('/dashboard/scenarios');
  }

  if (session.user.role === 'CITY_ADMIN' && !session.user.onboardingComplete) {
    redirect('/dashboard/onboarding');
  }

  if (session.user.role === 'URBAN_PLANNER' && !session.user.onboardingComplete) {
    redirect('/dashboard/waiting');
  }

  redirect('/dashboard/neighborhoods');
}
