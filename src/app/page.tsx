'use client';

import TopNav from '@/components/layout/TopNav';
import SideNav from '@/components/layout/SideNav';
import MobileNav from '@/components/layout/MobileNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import AnimatedCounter from '@/components/shared/AnimatedCounter';
import Link from 'next/link';
import { kpiData, vulnerabilityHotspots } from '@/lib/data/seed';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav />
      <SideNav activeItem="Heat Index" />
      <MobileNav />

      <main className="md:ml-64 mt-16 p-4 md:p-8 min-h-screen pb-20 md:pb-8">
        {/* Header */}
        <GSAPWrapper animation="slideUp">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
            <div>
              <h1 className="font-[var(--font-headline)] text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                Executive Impact
              </h1>
              <p className="text-[#a3aac4] font-medium mt-1">
                Strategic oversight for Metropolitan Heat Resilience Phase 4
              </p>
            </div>
            <div className="flex gap-4 flex-wrap">
              <Link href="/scenarios" className="flex items-center gap-2 px-5 py-2.5 bg-[#141f38] hover:bg-[#192540] text-[#dee5ff] border border-[#40485d]/20 rounded-md transition-all">
                <span className="material-symbols-outlined text-[20px]">add_task</span>
                <span className="font-semibold text-sm">Start New Scenario</span>
              </Link>
              <Link href="/reports" className="flex items-center gap-2 px-5 py-2.5 bg-[#141f38] hover:bg-[#192540] text-[#dee5ff] border border-[#40485d]/20 rounded-md transition-all">
                <span className="material-symbols-outlined text-[20px]">ios_share</span>
                <span className="font-semibold text-sm">Export Annual Report</span>
              </Link>
            </div>
          </div>
        </GSAPWrapper>

        {/* KPI Row */}
        <GSAPWrapper animation="slideUp" delay={0.1} stagger>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="glass-card-hover p-6 rounded-xl border-l-4 border-[#ff8439] relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <span className="material-symbols-outlined text-6xl">thermostat</span>
              </div>
              <p className="text-[#a3aac4] text-[10px] uppercase tracking-widest mb-2 font-bold">City-Wide Temp</p>
              <div className="flex items-baseline gap-2">
                <span className="font-[var(--font-headline)] text-3xl font-bold text-white">
                  <AnimatedCounter value={kpiData.cityWideTemp.value} decimals={1} suffix="°F" />
                </span>
                <span className="text-[#ff8439] text-xs font-bold flex items-center">
                  <span className="material-symbols-outlined text-xs">trending_up</span> {kpiData.cityWideTemp.change}%
                </span>
              </div>
              <div className="w-full h-1 bg-[#0f1930] mt-4 rounded-full overflow-hidden">
                <div className="h-full bg-[#ff8439] w-[85%]"></div>
              </div>
            </div>
            <div className="glass-card-hover p-6 rounded-xl border-l-4 border-[#69f6b8] relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <span className="material-symbols-outlined text-6xl">favorite</span>
              </div>
              <p className="text-[#a3aac4] text-[10px] uppercase tracking-widest mb-2 font-bold">Deaths Prevented</p>
              <div className="flex items-baseline gap-2">
                <span className="font-[var(--font-headline)] text-3xl font-bold text-white">
                  <AnimatedCounter value={kpiData.deathsPrevented.value} />
                </span>
                <span className="text-[#69f6b8] text-xs font-bold">Projected</span>
              </div>
              <p className="text-[10px] text-[#a3aac4] mt-4">Based on canopy expansion models</p>
            </div>
            <div className="glass-card-hover p-6 rounded-xl border-l-4 border-[#699cff] relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <span className="material-symbols-outlined text-6xl">park</span>
              </div>
              <p className="text-[#a3aac4] text-[10px] uppercase tracking-widest mb-2 font-bold">Tree Canopy %</p>
              <div className="flex items-baseline gap-2">
                <span className="font-[var(--font-headline)] text-3xl font-bold text-white">
                  <AnimatedCounter value={kpiData.treeCanopy.value} decimals={1} suffix="%" />
                </span>
                <span className="text-[#699cff] text-xs font-bold flex items-center">
                  <span className="material-symbols-outlined text-xs">add</span> {kpiData.treeCanopy.change}%
                </span>
              </div>
              <div className="flex gap-1 mt-4">
                <div className="h-1 flex-1 bg-[#699cff] rounded-full"></div>
                <div className="h-1 flex-1 bg-[#699cff] rounded-full"></div>
                <div className="h-1 flex-1 bg-[#0f1930] rounded-full"></div>
                <div className="h-1 flex-1 bg-[#0f1930] rounded-full"></div>
              </div>
            </div>
            <div className="glass-card-hover p-6 rounded-xl border-l-4 border-[#dee5ff] relative overflow-hidden">
              <div className="absolute right-[-10px] top-[-10px] opacity-10">
                <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
              </div>
              <p className="text-[#a3aac4] text-[10px] uppercase tracking-widest mb-2 font-bold">Mitigation Budget</p>
              <div className="flex items-baseline gap-1">
                <span className="font-[var(--font-headline)] text-2xl font-bold text-white">
                  <AnimatedCounter value={14.2} decimals={1} prefix="$" suffix="M" />
                </span>
                <span className="text-[#a3aac4] text-xs font-medium">/ $20M</span>
              </div>
              <div className="mt-4 flex justify-between items-center text-[10px] text-[#a3aac4]">
                <span>Spent: 71%</span>
                <span>Remaining: $5.8M</span>
              </div>
            </div>
          </div>
        </GSAPWrapper>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          <GSAPWrapper animation="slideUp" delay={0.2} className="lg:col-span-8">
            <div className="glass-card rounded-xl p-6 md:p-8 relative min-h-[400px]">
              <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
                <div>
                  <h3 className="font-[var(--font-headline)] text-xl font-bold text-white">Mitigation Progress</h3>
                  <p className="text-[#a3aac4] text-sm">Temperature reduction trends vs. intervention density</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 bg-[#091328] rounded-full text-[10px] font-bold text-[#69f6b8] uppercase border border-[#69f6b8]/20">Active Projects</span>
                  <span className="px-3 py-1 bg-[#091328] rounded-full text-[10px] font-bold text-[#699cff] uppercase border border-[#699cff]/20">Target Temp</span>
                </div>
              </div>
              <div className="relative h-56 w-full mt-8 flex items-end justify-between px-2">
                <div className="absolute inset-0 flex flex-col justify-between py-2 border-l border-[#40485d]/20">
                  {['95°', '92°', '89°', '86°'].map((t) => (
                    <div key={t} className="w-full border-t border-[#40485d]/10 text-[10px] text-[#a3aac4] pl-2">{t}</div>
                  ))}
                </div>
                <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
                  <path d="M0,80 Q100,60 200,90 T400,120 T600,70 T800,40" fill="none" stroke="#69f6b8" strokeLinecap="round" strokeWidth="4" />
                  <path d="M0,100 Q150,110 300,95 T600,105 T800,110" fill="none" stroke="#699cff" strokeDasharray="4" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <div className="absolute bottom-[-30px] w-full flex justify-between px-2 text-[10px] text-[#a3aac4]">
                  {['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV'].map((m) => (<span key={m}>{m}</span>))}
                </div>
              </div>
              <div className="mt-16 grid grid-cols-3 gap-4">
                {[{ label: 'Cool Pavement', value: '+12.4 mi²' }, { label: 'Green Roofs', value: '+84 units' }, { label: 'Mist Stations', value: '12 planned' }].map((item) => (
                  <div key={item.label} className="bg-[#091328] p-4 rounded-lg">
                    <p className="text-[10px] text-[#a3aac4] uppercase tracking-widest">{item.label}</p>
                    <p className="text-lg font-bold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </GSAPWrapper>

          <GSAPWrapper animation="slideRight" delay={0.3} className="lg:col-span-4">
            <div className="glass-card rounded-xl overflow-hidden flex flex-col h-full">
              <div className="p-6 bg-[#141f38] border-b border-[#40485d]/10">
                <h3 className="font-[var(--font-headline)] text-lg font-bold text-white">Vulnerability Hotspots</h3>
                <p className="text-[#a3aac4] text-xs">Top 5 prioritize zones for immediate funding</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {vulnerabilityHotspots.map((spot) => (
                  <Link key={spot.id} href="/vulnerability" className="p-4 hover:bg-[#192540] transition-colors cursor-pointer border-b border-[#40485d]/5 block">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-sm">{spot.name}</span>
                      <span className="text-[#ff955a] font-bold text-xs px-2 bg-[#ff955a]/10 rounded">Score {spot.score}</span>
                    </div>
                    <div className="flex gap-2 items-center flex-wrap">
                      <span className="material-symbols-outlined text-xs text-[#a3aac4]">{spot.icon}</span>
                      {spot.factors.map((f, i) => (
                        <span key={i} className="text-[10px] text-[#a3aac4]">{i > 0 && '• '}{f}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/vulnerability" className="p-4 text-[#69f6b8] text-[10px] font-bold uppercase tracking-widest text-center bg-[#091328] hover:text-white transition-colors block">
                View Full Risk Registry
              </Link>
            </div>
          </GSAPWrapper>

          <GSAPWrapper animation="slideUp" delay={0.4} className="lg:col-span-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
              <div className="md:col-span-1 bg-[#0f1930] rounded-xl p-6 flex flex-col">
                <h3 className="font-[var(--font-headline)] text-lg font-bold text-white mb-6">Equity &amp; Access</h3>
                <div className="relative flex-1 flex items-center justify-center p-4 min-h-[200px]">
                  <div className="relative w-40 h-40 border border-[#40485d]/20 rounded-full flex items-center justify-center">
                    <div className="absolute w-28 h-28 border border-[#40485d]/20 rounded-full"></div>
                    <div className="absolute w-14 h-14 border border-[#40485d]/20 rounded-full"></div>
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                      <polygon points="50,10 80,40 70,80 30,80 20,40" fill="rgba(105,246,184,0.3)" stroke="#69f6b8" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute top-0 text-[9px] uppercase tracking-widest text-[#a3aac4]">Accessibility</div>
                  <div className="absolute bottom-0 text-[9px] uppercase tracking-widest text-[#a3aac4]">Density</div>
                </div>
                <p className="text-[11px] text-[#a3aac4] mt-6 text-center italic">&quot;Intervention parity reached 84% across income quintiles.&quot;</p>
              </div>
              <div className="md:col-span-2 bg-[#060e20] rounded-xl overflow-hidden relative border border-[#40485d]/10 min-h-[300px]">
                <div className="absolute inset-0 bg-gradient-to-br from-[#ff8439]/10 via-transparent to-[#69f6b8]/5"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#060e20] to-transparent p-8 flex flex-col justify-center">
                  <div className="glass-panel p-6 rounded-lg max-w-xs border border-white/5">
                    <div className="flex items-center gap-2 mb-2 text-[#69f6b8]">
                      <span className="material-symbols-outlined">map</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Active Scenario</span>
                    </div>
                    <h4 className="font-[var(--font-headline)] text-lg font-bold text-white">Central Core Reforestation</h4>
                    <p className="text-xs text-[#a3aac4] mt-2 leading-relaxed">Currently simulating a 15% increase in native tree species along the main arterial corridor. Estimated ROI: 2.1°F reduction.</p>
                    <Link href="/map" className="mt-4 text-xs font-bold text-[#69f6b8] hover:underline block">Go to Map View →</Link>
                  </div>
                </div>
              </div>
            </div>
          </GSAPWrapper>
        </div>

        <footer className="mt-16 pt-8 border-t border-[#40485d]/10 flex flex-col md:flex-row justify-between items-center text-[#a3aac4] text-[10px] uppercase tracking-[0.2em] gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">security</span>
            <span>Government Authorized Data Access Only</span>
          </div>
          <div>© 2026 Civic Intelligence &amp; Urban Cartography Dept.</div>
          <div className="flex gap-4">
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">System Status</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
