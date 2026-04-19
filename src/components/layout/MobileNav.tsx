'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dash', href: '/', icon: 'dashboard' },
  { label: 'Map', href: '/map', icon: 'map' },
  { label: 'Data', href: '/vulnerability', icon: 'analytics' },
  { label: 'User', href: '/resident', icon: 'person' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full glass-overlay border-t border-white/5 flex justify-around items-center h-16 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 transition-colors ${isActive ? 'text-[var(--green-400)]' : 'text-[var(--text-tertiary)]'}`}>
            <span className="material-symbols-outlined text-xl" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
