'use client';

import Link from 'next/link';
import { baselineMeasurements, cityZones, interventions } from '@/lib/data/seed';

const reportTemplates = [
  { title: 'Monthly Impact Summary', description: 'Auto-generated overview of all intervention impacts, KPI changes, and budget utilization for the current month.', icon: 'summarize', lastRun: '2 days ago', status: 'Ready' },
  { title: 'Equity & Vulnerability Report', description: 'Detailed breakdown of heat exposure by demographic, ward-level vulnerability indices, and equity scores.', icon: 'diversity_3', lastRun: '1 week ago', status: 'Ready' },
  { title: 'Budget Allocation Analysis', description: 'Capital expenditure breakdown by intervention type, scenario comparison costs, and projected ROI.', icon: 'account_balance', lastRun: '3 days ago', status: 'Ready' },
  { title: 'Environmental Compliance', description: 'EPA/NOAA-aligned environmental impact statement for all active and planned interventions.', icon: 'eco', lastRun: 'Never', status: 'Draft' },
];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#060e20] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none"></div>
      <div className="fixed top-[-15%] right-[-5%] w-[500px] h-[500px] orb orb-secondary opacity-20 pointer-events-none"></div>
      <div className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] orb orb-primary opacity-15 pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-20 glass-overlay border-b border-white/5 px-6 py-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#69f6b8] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#69f6b8] font-[family-name:var(--font-headline)]">HeatPlan</span>
            </Link>
            <span className="text-white/20">|</span>
            <nav className="flex items-center gap-1">
              {[{ label: 'Map', href: '/map' }, { label: 'Vulnerability', href: '/vulnerability' }, { label: 'Reports', href: '/reports' }].map((item) => (
                <Link key={item.label} href={item.href} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${item.href === '/reports' ? 'bg-[#699cff]/10 text-[#699cff]' : 'text-[#6d758c] hover:text-white hover:bg-white/5'}`}>{item.label}</Link>
              ))}
            </nav>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-[#699cff] to-[#4a7ae0] text-white font-bold rounded-xl shadow-xl text-xs btn-shine flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            Create Custom Report
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl p-4 md:p-8 pb-24 md:pb-8 flex flex-col gap-8">
        {/* Page header */}
        <div className="animate-reveal-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#699cff]/10 border border-[#699cff]/20 mb-3">
            <span className="material-symbols-outlined text-sm text-[#699cff]" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
            <span className="text-[10px] font-bold text-[#699cff] tracking-widest uppercase">Analytics</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter font-[family-name:var(--font-headline)]">Reports &amp; Exports</h1>
          <p className="text-[#a3aac4] mt-2 max-w-2xl">Generate, schedule, and export analytic reports across all Urban Heat Mitigator datasets.</p>
        </div>

        {/* Report Templates */}
        <div className="stagger-children">
          <h2 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((t) => (
              <div key={t.title} className="glass-card rounded-xl p-6 hover:border-[#699cff]/30 transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#699cff]/10 flex items-center justify-center text-[#699cff] shrink-0 group-hover:bg-[#699cff]/20 transition-all">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{t.title}</h3>
                    <p className="text-[#a3aac4] text-sm mt-1 leading-relaxed">{t.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">Last Run: {t.lastRun}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'Ready' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' : 'bg-[#ff8439]/10 text-[#ff8439]'}`}>{t.status}</span>
                    </div>
                  </div>
                  <button className="material-symbols-outlined text-[#6d758c] hover:text-white transition-all p-2 hover:bg-white/5 rounded-xl">download</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Tables */}
        <div className="animate-reveal-up">
          <section className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#40485d]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Monthly Baseline Measurements</h3>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[#6d758c] hover:text-white hover:bg-white/5 transition-all">CSV</button>
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[#6d758c] hover:text-white hover:bg-white/5 transition-all">JSON</button>
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[#6d758c] hover:text-white hover:bg-white/5 transition-all">PDF</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Avg Temp (°F)</th>
                    <th className="px-6 py-4">Heat Index</th>
                    <th className="px-6 py-4">UHI Intensity</th>
                    <th className="px-6 py-4">Energy Use (MWh)</th>
                    <th className="px-6 py-4">ER Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#40485d]/10">
                  {baselineMeasurements.map((m) => {
                    const avgF = +(m.avgTempCelsius * 9 / 5 + 32).toFixed(1);
                    const heatIdx = +(avgF + (m.maxTempCelsius * 9 / 5 + 32 - avgF) * 0.3).toFixed(1);
                    const uhi = +((m.maxTempCelsius - m.avgTempCelsius) * 9 / 5).toFixed(1);
                    const energy = Math.round(avgF * 52);
                    return (
                    <tr key={m.month} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-3 font-semibold text-[#dee5ff]">{m.month}</td>
                      <td className="px-6 py-3">{avgF}°F</td>
                      <td className="px-6 py-3">{heatIdx}°F</td>
                      <td className={`px-6 py-3 font-bold ${uhi >= 8 ? 'text-[#ff716c]' : uhi >= 5 ? 'text-[#ff8439]' : 'text-[#69f6b8]'}`}>{uhi}°F</td>
                      <td className="px-6 py-3">{energy.toLocaleString()}</td>
                      <td className="px-6 py-3">{m.heatDeathsEstimated}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Zone Summary */}
        <div className="animate-reveal-up">
          <section className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#40485d]/10">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Zone Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Zone</th>
                    <th className="px-6 py-4">Population</th>
                    <th className="px-6 py-4">Area (km²)</th>
                    <th className="px-6 py-4">Avg Temp</th>
                    <th className="px-6 py-4">Canopy %</th>
                    <th className="px-6 py-4">Vulnerability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#40485d]/10">
                  {cityZones.map((z) => {
                    const avgF = +(z.avgTemp * 9 / 5 + 32).toFixed(1);
                    return (
                    <tr key={z.id} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-3 font-semibold text-[#dee5ff]">{z.name}</td>
                      <td className="px-6 py-3">{z.populationDensity.toLocaleString()}</td>
                      <td className="px-6 py-3">{(z.populationDensity / 2800).toFixed(1)}</td>
                      <td className={`px-6 py-3 font-bold ${avgF >= 100 ? 'text-[#ff716c]' : avgF >= 95 ? 'text-[#ff8439]' : 'text-[#69f6b8]'}`}>{avgF}°F</td>
                      <td className="px-6 py-3">{z.treeCanopyPct}%</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          z.vulnerabilityScore >= 8 ? 'bg-[#ff716c]/10 text-[#ff716c]' :
                          z.vulnerabilityScore >= 6 ? 'bg-[#ff8439]/10 text-[#ff8439]' :
                          'bg-[#69f6b8]/10 text-[#69f6b8]'
                        }`}>{z.vulnerabilityScore}/10</span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Active Interventions */}
        <div className="animate-reveal-up">
          <section className="glass-card rounded-2xl overflow-hidden mb-12">
            <div className="p-6 border-b border-[#40485d]/10">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Active Interventions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Intervention</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Zone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Temp Reduction</th>
                    <th className="px-6 py-4">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#40485d]/10">
                  {interventions.map((i) => (
                    <tr key={i.id} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-3 font-semibold text-[#dee5ff]">{i.name}</td>
                      <td className="px-6 py-3 capitalize">{i.type.replace('_', ' ')}</td>
                      <td className="px-6 py-3">{i.zoneId}</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          i.status === 'completed' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' :
                          i.status === 'in_progress' ? 'bg-[#699cff]/10 text-[#699cff]' :
                          'bg-[#ff8439]/10 text-[#ff8439]'
                        }`}>{i.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-3 font-bold text-[#69f6b8]">{(i.tempReduction * 1.8).toFixed(1)}°F</td>
                      <td className="px-6 py-3">${(i.estimatedCostUsd / 1e6).toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-overlay border-t border-white/5 flex justify-around py-3 md:hidden">
        {[{ label: 'Map', icon: 'map', href: '/map' }, { label: 'Vulnerability', icon: 'warning', href: '/vulnerability' }, { label: 'Reports', icon: 'summarize', href: '/reports' }, { label: 'Dashboard', icon: 'dashboard', href: '/dashboard' }].map((item) => (
          <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 ${item.href === '/reports' ? 'text-[#699cff]' : 'text-[#6d758c]'}`}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: item.href === '/reports' ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
