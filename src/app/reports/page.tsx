'use client';

import TopNav from '@/components/layout/TopNav';
import SideNav from '@/components/layout/SideNav';
import MobileNav from '@/components/layout/MobileNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import { baselineMeasurements, cityZones, interventions } from '@/lib/data/seed';

const reportTemplates = [
  { title: 'Monthly Impact Summary', description: 'Auto-generated overview of all intervention impacts, KPI changes, and budget utilization for the current month.', icon: 'summarize', lastRun: '2 days ago', status: 'Ready' },
  { title: 'Equity & Vulnerability Report', description: 'Detailed breakdown of heat exposure by demographic, ward-level vulnerability indices, and equity scores.', icon: 'diversity_3', lastRun: '1 week ago', status: 'Ready' },
  { title: 'Budget Allocation Analysis', description: 'Capital expenditure breakdown by intervention type, scenario comparison costs, and projected ROI.', icon: 'account_balance', lastRun: '3 days ago', status: 'Ready' },
  { title: 'Environmental Compliance', description: 'EPA/NOAA-aligned environmental impact statement for all active and planned interventions.', icon: 'eco', lastRun: 'Never', status: 'Draft' },
];

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav />
      <SideNav activeItem="Reports" />
      <MobileNav />

      <main className="md:ml-64 mt-16 p-4 md:p-8 min-h-screen pb-20 md:pb-8 flex flex-col gap-8">
        {/* Header */}
        <GSAPWrapper animation="slideUp">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="text-xs font-bold text-[#699cff] tracking-[0.2em] uppercase font-[var(--font-headline)]">Analytics</span>
              <h1 className="text-3xl md:text-4xl font-black text-white mt-2 tracking-tighter font-[var(--font-headline)]">Reports &amp; Exports</h1>
              <p className="text-[#a3aac4] mt-2 max-w-2xl">Generate, schedule, and export analytic reports across all Urban Heat Mitigator datasets.</p>
            </div>
            <button className="px-6 py-3 bg-gradient-to-br from-[#699cff] to-[#4a7ae0] text-white font-bold rounded-md shadow-xl active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">add</span>
              Create Custom Report
            </button>
          </header>
        </GSAPWrapper>

        {/* Report Templates */}
        <GSAPWrapper animation="slideUp" delay={0.1} stagger>
          <h2 className="font-[var(--font-headline)] font-bold text-xl text-white mb-4">Report Templates</h2>
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
                      <span className="text-[10px] uppercase tracking-widest text-slate-500">Last Run: {t.lastRun}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'Ready' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' : 'bg-[#ff8439]/10 text-[#ff8439]'}`}>{t.status}</span>
                    </div>
                  </div>
                  <button className="material-symbols-outlined text-slate-500 hover:text-white transition-all p-2 hover:bg-[#192540] rounded">download</button>
                </div>
              </div>
            ))}
          </div>
        </GSAPWrapper>

        {/* Data Tables */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <section className="glass-card rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#40485d]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-[var(--font-headline)] font-bold text-xl text-white">Monthly Baseline Measurements</h3>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1 border border-[#40485d] rounded text-slate-400 hover:text-white hover:bg-[#192540] transition-all">CSV</button>
                <button className="text-xs px-3 py-1 border border-[#40485d] rounded text-slate-400 hover:text-white hover:bg-[#192540] transition-all">JSON</button>
                <button className="text-xs px-3 py-1 border border-[#40485d] rounded text-slate-400 hover:text-white hover:bg-[#192540] transition-all">PDF</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
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
        </GSAPWrapper>

        {/* Zone Summary */}
        <GSAPWrapper animation="slideUp" delay={0.3}>
          <section className="glass-card rounded-xl overflow-hidden mb-12">
            <div className="p-6 border-b border-[#40485d]/10">
              <h3 className="font-[var(--font-headline)] font-bold text-xl text-white">Zone Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
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
        </GSAPWrapper>

        {/* Active Interventions */}
        <GSAPWrapper animation="slideUp" delay={0.4}>
          <section className="glass-card rounded-xl overflow-hidden mb-12">
            <div className="p-6 border-b border-[#40485d]/10">
              <h3 className="font-[var(--font-headline)] font-bold text-xl text-white">Active Interventions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
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
        </GSAPWrapper>
      </main>
    </div>
  );
}
