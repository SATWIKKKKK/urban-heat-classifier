'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';

const adminNavItems = [
  { label: 'Overview', href: '/dashboard', icon: 'dashboard' },
  { label: 'Neighborhoods', href: '/dashboard/neighborhoods', icon: 'location_city' },
  { label: 'Map', href: '/map', icon: 'map' },
  { label: 'Interventions', href: '/dashboard/interventions', icon: 'construction' },
  { label: 'Scenarios', href: '/scenarios', icon: 'compare_arrows' },
  { label: 'Reports', href: '/reports', icon: 'assessment' },
  { label: 'Vulnerability', href: '/vulnerability', icon: 'warning' },
  { label: 'Data Management', href: '/dashboard/data', icon: 'storage' },
  { label: 'Admin', href: '/dashboard/admin', icon: 'admin_panel_settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { can } = usePermissions();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = adminNavItems.filter((item) => {
    if (item.href === '/dashboard/admin') return can('manage_users');
    if (item.href === '/dashboard/data') return can('ingest_data');
    return true;
  });

  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 glass-overlay border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden material-symbols-outlined text-[#a3aac4] hover:text-white"
          >
            menu
          </button>
          <Link href="/dashboard" className="text-xl font-bold tracking-tighter text-[#69f6b8] font-[var(--font-headline)]">
            HeatPlan
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[#a3aac4] hidden md:block">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#69f6b8]/10 text-[#69f6b8] uppercase tracking-widest hidden md:block">
            {session?.user?.role?.replace('_', ' ')}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 text-slate-400 hover:bg-[#192540] rounded-lg transition-all"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 z-40 glass-panel border-r border-white/5 p-4 overflow-y-auto transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <nav className="flex flex-col gap-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-[#69f6b8]/10 text-[#69f6b8]'
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
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="md:ml-64 mt-16 p-4 md:p-8 min-h-screen pb-20 md:pb-8">
        {children}
      </main>
    </div>
  );
}
