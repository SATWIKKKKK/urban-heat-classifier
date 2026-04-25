'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isOnboarding = pathname.startsWith('/dashboard/onboarding');
  const onboardingComplete = session?.user?.onboardingComplete;
  const isCityAdmin = session?.user?.role === 'CITY_ADMIN';
  // Only hide when onboarding incomplete and NOT a city admin.
  const hideNav = isOnboarding || (status === 'authenticated' && !onboardingComplete && !isCityAdmin);

  // Full-screen routes that must not be wrapped in the page container
  const isFullscreen = pathname.startsWith('/dashboard/map');

  return (
    <div className="min-h-screen bg-[var(--bg-base)] relative overflow-x-hidden">
      {/* Background effects matching design system */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
      <div className="fixed top-[-15%] right-[-5%] w-[500px] h-[500px] orb orb-primary opacity-10 pointer-events-none" />
      <div className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] orb orb-secondary opacity-8 pointer-events-none" />

      {!hideNav && <GlobalNavbar />}

      {isFullscreen ? (
        <main className={`${hideNav ? '' : 'pt-[60px]'} relative z-10`}>
          {children}
        </main>
      ) : (
        <main className={`${hideNav ? '' : 'pt-[60px]'} relative z-10 min-h-screen`}>
          <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 pb-20">
            {children}
          </div>
        </main>
      )}
    </div>
  );
}

