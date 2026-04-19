'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';

const ALL_NAV_ITEMS = [
  { label: 'My Data', href: '/dashboard/mydata', icon: 'person', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER', 'WARD_OFFICER', 'SDMA_OBSERVER', 'NGO_FIELD_WORKER', 'DATA_ANALYST', 'CITIZEN_REPORTER'] },
  { label: 'Map', href: '/dashboard/map', icon: 'map', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'SDMA_OBSERVER', 'DATA_ANALYST', 'CITIZEN_REPORTER'] },
  { label: 'Interventions', href: '/dashboard/interventions', icon: 'construction', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN'] },
  { label: 'Scenarios', href: '/dashboard/scenarios', icon: 'compare_arrows', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER'] },
  { label: 'Reports', href: '/dashboard/reports', icon: 'assessment', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER', 'SDMA_OBSERVER', 'DATA_ANALYST'] },
  { label: 'Data Management', href: '/dashboard/data', icon: 'storage', roles: ['CITY_ADMIN', 'SUPER_ADMIN', 'DATA_ANALYST'] },
  { label: 'Settings', href: '/dashboard/settings', icon: 'settings', roles: ['CITY_ADMIN', 'URBAN_PLANNER', 'SUPER_ADMIN', 'CITY_COUNCIL', 'MUNICIPAL_COMMISSIONER', 'WARD_OFFICER', 'SDMA_OBSERVER', 'NGO_FIELD_WORKER', 'DATA_ANALYST', 'CITIZEN_REPORTER'] },
];

interface GlobalNavbarProps {
  /** The active accent color class, e.g. 'var(--green-400)', 'var(--critical)' */
  accentColor?: string;
  /** Which nav link href to treat as currently active */
  activeHref?: string;
  /** Extra right-side action buttons rendered before the user menu */
  rightActions?: React.ReactNode;
}

export default function GlobalNavbar({ accentColor = 'var(--green-400)', activeHref, rightActions }: GlobalNavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = session?.user?.role;
  const currentHref = activeHref ?? pathname;

  const navItems = role === 'SUPER_ADMIN'
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  // Close user dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      {/* Top navbar */}
      <header className="fixed top-0 w-full z-50 glass-overlay border-b border-white/5 px-4 md:px-6 py-3">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-3">
          {/* Left: logo + page nav tabs */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard/mydata" className="flex items-center gap-2 shrink-0">
              <span className="material-symbols-outlined text-2xl shrink-0" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] hidden sm:block font-[family-name:var(--font-headline)]" style={{ color: accentColor }}>HeatPlan</span>
            </Link>
            <span className="text-white/20 hidden md:block">|</span>
            {/* Active page breadcrumb */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
              {navItems.slice(0, 5).map((item) => {
                const isActive = currentHref === item.href || (item.href !== '/dashboard' && currentHref.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                    style={isActive ? { backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor } : undefined}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = accentColor; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = ''; }}
                    {...(!isActive ? { 'data-inactive': 'true' } : {})}
                    {...(!isActive ? { className: 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-[var(--text-tertiary)] hover:bg-white/5' } : {})}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: actions + user + hamburger */}
          <div className="flex items-center gap-2 shrink-0">
            {rightActions}

            {/* Role badge with colorful stripes */}
            {role && (
              <div className="hidden sm:flex items-center">
                <div className="flex items-stretch rounded-lg overflow-hidden mr-2">
                  <div className="flex flex-col w-2">
                    <span className="block h-1/3 bg-[var(--green-500)]" />
                    <span className="block h-1/3 bg-[var(--green-400)]" />
                    <span className="block h-1/3 bg-[var(--green-500)]/80" />
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-[var(--text-secondary)] rounded-r-lg whitespace-nowrap">
                    {role.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* User dropdown */}
            {session?.user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm text-white"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                  <span className="hidden md:block text-xs font-semibold max-w-[120px] truncate">{session.user.name ?? session.user.email}</span>
                  <span className={`material-symbols-outlined text-sm transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 glass-overlay border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[60]">
                    <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3 bg-gradient-to-r from-[var(--green-500)]/10 via-[var(--green-400)]/8 to-[var(--green-500)]/6">
                      <span className="inline-flex items-center justify-center rounded-full h-8 w-8 bg-[var(--green-400)]/12 text-[var(--green-400)]">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-white truncate">{session.user.name ?? '—'}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5">{session.user.email}</div>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
                      View Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
                      Settings
                    </Link>
                    <div className="border-t border-white/10">
                      <button
                        onClick={() => { setUserMenuOpen(false); void signOut({ callbackUrl: '/login' }); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 text-xs border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-all">Sign In</Link>
            )}

            {/* Hamburger with colorful stripes */}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex flex-col justify-center items-center gap-[4px] h-9 w-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all shrink-0"
              aria-label="Open menu"
            >
              <span className="block h-[2px] w-5 bg-[var(--green-500)] rounded-full transition-all" />
              <span className="block h-[2px] w-4 bg-[var(--green-400)] rounded-full transition-all" />
              <span className="block h-[2px] w-5 bg-[var(--green-500)]/80 rounded-full transition-all" />
            </button>
          </div>
        </div>
      </header>

      {/* Glassmorphism full-screen menu */}
      {menuOpen && (
        <>
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md"
            onClick={() => setMenuOpen(false)}
          />

          {/* Slide-in drawer */}
          <div
            ref={menuRef}
            className="fixed top-0 right-0 bottom-0 z-[80] w-full max-w-sm glass-overlay border-l border-white/10 shadow-2xl flex flex-col overflow-y-auto animate-slide-in-right"
            style={{ animationDuration: '0.2s' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl" style={{ color: accentColor, fontVariationSettings: "'FILL' 1" }}>eco</span>
                <span className="text-sm font-bold uppercase tracking-[0.2em] font-[family-name:var(--font-headline)]" style={{ color: accentColor }}>HeatPlan</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* User info strip */}
            {session?.user && (
              <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-[var(--text-tertiary)]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{session.user.name ?? session.user.email}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: accentColor }}>{role?.replace(/_/g, ' ')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = currentHref === item.href || (item.href !== '/dashboard' && currentHref.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all"
                    style={isActive ? { backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor } : undefined}
                    onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; } }}
                    onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = ''; (e.currentTarget as HTMLElement).style.backgroundColor = ''; } }}
                  >
                    <span
                      className="material-symbols-outlined text-lg shrink-0 transition-colors"
                      style={isActive ? { fontVariationSettings: "'FILL' 1", color: accentColor } : { color: 'var(--text-tertiary)' }}
                    >{item.icon}</span>
                    <span className={`text-sm font-semibold transition-colors ${isActive ? '' : 'text-[var(--text-secondary)]'}`}>
                      {item.label}
                    </span>
                    {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />}
                  </Link>
                );
              })}
            </nav>

            {/* Footer: sign out */}
            <div className="px-4 py-4 border-t border-white/10">
              <button
                onClick={() => { setMenuOpen(false); void signOut({ callbackUrl: '/login' }); }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-[var(--critical)] hover:bg-[var(--critical)]/10 transition-all"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="text-sm font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
