'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sideNavItems = [
  { label: 'Heat Index', icon: 'thermostat', href: '/' },
  { label: 'Tree Canopy', icon: 'park', href: '/map' },
  { label: 'Population', icon: 'groups', href: '/vulnerability' },
  { label: 'Infrastructure', icon: 'domain', href: '/scenarios' },
  { label: 'Analytics', icon: 'analytics', href: '/reports' },
];

interface SideNavProps {
  activeItem?: string;
}

export default function SideNav({ activeItem }: SideNavProps) {
  const pathname = usePathname();

  const getActiveLabel = () => {
    if (activeItem) return activeItem;
    const match = sideNavItems.find(item => item.href === pathname);
    return match?.label || 'Heat Index';
  };

  const active = getActiveLabel();

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-64px)] w-64 flex-col z-40 glass-overlay border-r border-white/5 font-[family-name:var(--font-headline)] hidden md:flex">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-2 h-2 rounded-full bg-[var(--green-400)] shadow-[0_0_8px_var(--green-400)]"></div>
          <h2 className="text-lg font-black text-white">Map Context</h2>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-widest">
          Layer Controls &amp; Legend
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {sideNavItems.map((item) => {
          const isActive = item.label === active;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`p-3 flex items-center gap-4 cursor-pointer transition-all rounded-xl ${
                isActive
                  ? 'bg-[var(--green-400)]/10 text-[var(--green-400)] shadow-[0_0_12px_transparent]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--green-400)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
              <span className="text-xs font-medium uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 space-y-4">
        <Link
          href="/resident/request-tree"
          className="w-full py-3 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] rounded-xl font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-95 transition-transform "
        >
          <span className="material-symbols-outlined">add</span>
          Add Intervention
        </Link>
        <div className="pt-4 border-t border-white/5">
          <div className="text-[var(--text-tertiary)] hover:text-white px-2 py-2 flex items-center gap-3 cursor-pointer text-xs uppercase tracking-widest rounded-lg hover:bg-[var(--bg-elevated)] transition-all">
            <span className="material-symbols-outlined text-sm">help</span>
            Help
          </div>
          <div className="text-[var(--text-tertiary)] hover:text-white px-2 py-2 flex items-center gap-3 cursor-pointer text-xs uppercase tracking-widest rounded-lg hover:bg-[var(--bg-elevated)] transition-all">
            <span className="material-symbols-outlined text-sm">chat_bubble</span>
            Feedback
          </div>
        </div>
      </div>
    </aside>
  );
}
