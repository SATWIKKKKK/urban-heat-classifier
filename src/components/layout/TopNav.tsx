'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const plannerNavItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Map', href: '/map' },
  { label: 'Scenarios', href: '/scenarios' },
  { label: 'Vulnerability', href: '/vulnerability' },
  { label: 'Reports', href: '/reports' },
];

const residentNavItems = [
  { label: 'Home', href: '/resident' },
  { label: 'Request Tree', href: '/resident/request-tree' },
  { label: 'My Requests', href: '/resident/my-requests' },
  { label: 'City Map', href: '/map' },
];

export default function TopNav({ variant = 'planner' }: { variant?: 'planner' | 'resident' }) {
  const pathname = usePathname();
  const navItems = variant === 'resident' ? residentNavItems : plannerNavItems;

  return (
    <header className="fixed top-0 w-full z-50 glass-overlay border-b border-white/5">
      <div className="flex justify-between items-center px-4 md:px-6 h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="text-lg font-bold tracking-tight text-white font-[family-name:var(--font-headline)]">HeatPlan</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-[#69f6b8] bg-[#69f6b8]/10'
                      : 'text-[#a3aac4] hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-[#6d758c] hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <span className="material-symbols-outlined text-xl">notifications</span>
          </button>
          <button className="p-2 text-[#6d758c] hover:text-white hover:bg-white/5 rounded-xl transition-all">
            <span className="material-symbols-outlined text-xl">settings</span>
          </button>
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center ml-1">
            <span className="material-symbols-outlined text-[#a3aac4] text-lg">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
