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
  { label: 'My Neighborhood', href: '/resident/my-requests' },
  { label: 'City Projects', href: '/map' },
  { label: 'Heat Safety Tips', href: '/resident' },
];

export default function TopNav({ variant = 'planner' }: { variant?: 'planner' | 'resident' }) {
  const pathname = usePathname();
  const navItems = variant === 'resident' ? residentNavItems : plannerNavItems;

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#060e20] shadow-[0_40px_40px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-xl font-bold tracking-tighter text-[#69f6b8] font-[var(--font-headline)]">
          Urban Heat Mitigator
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm tracking-tight font-semibold transition-colors font-[var(--font-headline)] ${
                  isActive
                    ? 'text-[#69f6b8] border-b-2 border-[#69f6b8] pb-1'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:bg-[#192540] rounded-lg transition-all active:scale-90">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 text-slate-400 hover:bg-[#192540] rounded-lg transition-all active:scale-90">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#40485d] bg-[#192540] flex items-center justify-center">
          <span className="material-symbols-outlined text-[#a3aac4] text-lg">person</span>
        </div>
      </div>
    </header>
  );
}
