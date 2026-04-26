'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown, User, Database, LogOut, PanelRight } from 'lucide-react';

const ALL_NAV_ITEMS = [
  { label: 'My Data', href: '/dashboard/mydata', icon: 'person', roles: ['CITY_ADMIN'] },
  { label: 'Map', href: '/dashboard/map', icon: 'map', roles: ['CITY_ADMIN'] },
  { label: 'Scenarios', href: '/dashboard/scenarios', icon: 'compare_arrows', roles: ['CITY_ADMIN'] },
  { label: 'Reports', href: '/dashboard/reports', icon: 'assessment', roles: ['CITY_ADMIN'] },
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

  const navItems = ALL_NAV_ITEMS.filter((item) => role && item.roles.includes(role));

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
                    className={isActive
                      ? "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
                      : "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap text-[var(--text-tertiary)] hover:bg-white/5"
                    }
                    style={isActive ? { backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor } : undefined}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = accentColor; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = ''; }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: notifications + role pill + user + sidebar toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {rightActions}

            {/* Bell notification button */}
            <div className="relative">
              <button
                style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                className="hover:bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]"
                aria-label="Notifications"
              >
                <Bell size={16} />
              </button>
              <span style={{
                position: 'absolute', top: '7px', right: '7px',
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#ef4444',
                pointerEvents: 'none',
              }} />
            </div>

            {/* Role pill */}
            {role && (
              <div className="hidden sm:flex items-center" style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                padding: '4px 10px 4px 8px',
                gap: '6px',
                cursor: 'default',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background:
                    role === 'SUPER_ADMIN' ? '#f97316' :
                    role === 'CITY_ADMIN' ? '#22c55e' :
                    role === 'URBAN_PLANNER' ? '#3b82f6' :
                    role === 'CITY_COUNCIL' ? '#a855f7' : '#22c55e',
                }} />
                <span style={{
                  fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                }}>
                  {role.replace(/_/g, ' ')}
                </span>
              </div>
            )}

            {/* User profile button */}
            {session?.user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '5px 10px 5px 6px',
                    borderRadius: '10px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  className="hover:border-[var(--border-strong)]"
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                    display: 'grid', placeItems: 'center',
                    fontSize: '11px', fontWeight: 700, color: 'white',
                    border: '1.5px solid rgba(34,197,94,0.40)',
                    flexShrink: 0,
                  }}>
                    {(session.user.name ?? session.user.email ?? 'U')[0].toUpperCase()}
                  </div>
                  <span className="hidden md:block" style={{
                    fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
                    maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {session.user.name ?? session.user.email}
                  </span>
                  <ChevronDown size={14} style={{
                    color: 'var(--text-tertiary)',
                    transition: 'transform 150ms',
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }} />
                </button>
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '12px',
                    padding: '6px',
                    minWidth: '180px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
                    zIndex: 60,
                  }}>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
                      style={{ textDecoration: 'none' }}
                    >
                      <User size={14} />
                      Profile Settings
                    </Link>
                    <Link
                      href="/dashboard/mydata"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-colors"
                      style={{ textDecoration: 'none' }}
                    >
                      <Database size={14} />
                      My Data
                    </Link>
                    <div style={{ margin: '4px 0', height: '1px', background: 'var(--border)' }} />
                    <button
                      onClick={() => { setUserMenuOpen(false); void signOut({ callbackUrl: '/login' }); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-[var(--text-secondary)] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#ef4444] transition-colors"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="px-4 py-2 text-xs border border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-all">Sign In</Link>
            )}

            {/* Sidebar toggle */}
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                width: '34px', height: '34px', borderRadius: '8px',
                background: menuOpen ? 'rgba(34,197,94,0.10)' : 'var(--bg-elevated)',
                border: menuOpen ? '1px solid rgba(34,197,94,0.30)' : '1px solid var(--border)',
                color: menuOpen ? '#22c55e' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 150ms',
                flexShrink: 0,
              }}
              className={menuOpen ? '' : 'hover:bg-[var(--bg-overlay)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'}
              aria-label="Open menu"
            >
              <PanelRight size={18} />
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
