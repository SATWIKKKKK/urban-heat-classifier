'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';

const adminNavItems = [
  { label: 'Map', href: '/dashboard/map', icon: 'map', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL'] },
  { label: 'Neighborhoods', href: '/dashboard/neighborhoods', icon: 'location_city', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'WARD_OFFICER'] },
  { label: 'Interventions', href: '/dashboard/interventions', icon: 'construction', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN'] },
  { label: 'Scenarios', href: '/dashboard/scenarios', icon: 'compare_arrows', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER'] },
  { label: 'Reports', href: '/dashboard/reports', icon: 'assessment', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER', 'SDMA_OBSERVER', 'DATA_ANALYST'] },
  { label: 'Vulnerability', href: '/vulnerability', icon: 'warning', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN'] },
  { label: 'Data Management', href: '/dashboard/data', icon: 'storage', roles: ['CITY_ADMIN', 'SUPER_ADMIN', 'DATA_ANALYST'] },
  { label: 'Commissioner', href: '/dashboard/commissioner', icon: 'gavel', roles: ['MUNICIPAL_COMMISSIONER'] },
  { label: 'Ward Reports', href: '/dashboard/ward', icon: 'apartment', roles: ['WARD_OFFICER'] },
  { label: 'State Overview', href: '/dashboard/state', icon: 'public', roles: ['SDMA_OBSERVER'] },
  { label: 'Field Surveys', href: '/dashboard/field', icon: 'explore', roles: ['NGO_FIELD_WORKER'] },
  { label: 'Data Analysis', href: '/dashboard/analyst', icon: 'analytics', roles: ['DATA_ANALYST'] },
  { label: 'My Reports', href: '/dashboard/citizen', icon: 'campaign', roles: ['CITIZEN_REPORTER'] },
  { label: 'Admin', href: '/dashboard/admin', icon: 'admin_panel_settings', roles: ['SUPER_ADMIN'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isOnboarding = pathname.startsWith('/dashboard/onboarding');
  const onboardingComplete = session?.user?.onboardingComplete;
  const hideSidebar = isOnboarding || !onboardingComplete;

  const userRole = session?.user?.role || 'PUBLIC';

  const filteredNav = adminNavItems.filter((item) => {
    if (userRole === 'SUPER_ADMIN') return true;
    return item.roles.includes(userRole);
  });

  return (
    <div className="min-h-screen bg-[#060e20] grid-pattern relative">
      {/* Decorative orbs */}
      <div className="orb orb-primary w-[400px] h-[400px] -top-[100px] -right-[100px] fixed" />
      <div className="orb orb-secondary w-[300px] h-[300px] bottom-0 -left-[80px] fixed" />

      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 glass-overlay border-b border-white/5">
        <div className="flex justify-between items-center px-4 md:px-6 h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-[#a3aac4] hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="text-lg font-bold tracking-tight text-white font-[family-name:var(--font-headline)]">HeatPlan</span>
            </Link>
            <span className="hidden lg:block h-5 w-px bg-white/10" />
            <span className="hidden lg:block text-xs text-[#6d758c] font-semibold">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#a3aac4] hidden md:block">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#69f6b8]/10 text-[#69f6b8] uppercase tracking-widest hidden md:block">
              {session?.user?.role?.replace('_', ' ')}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 text-[#6d758c] hover:text-white hover:bg-white/5 rounded-xl transition-all"
              title="Sign Out"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      {!hideSidebar && (
        <aside
          className={`fixed top-16 left-0 bottom-0 w-64 z-40 glass-overlay border-r border-white/5 overflow-y-auto transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <nav className="flex flex-col gap-1 p-3">
            {filteredNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#69f6b8]/10 text-[#69f6b8] glow-primary'
                      : 'text-[#a3aac4] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg" style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 mt-auto border-t border-white/5 mx-3">
            <Link
              href="/resident"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#6d758c] hover:text-white hover:bg-white/5 transition-all"
            >
              <span className="material-symbols-outlined text-lg">public</span>
              Resident Portal
            </Link>
          </div>
        </aside>
      )}

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && !hideSidebar && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className={`${hideSidebar ? '' : 'md:ml-64'} mt-16 p-4 md:p-8 min-h-screen pb-20 md:pb-8 relative z-10`}>
        {children}
      </main>
    </div>
  );
}
