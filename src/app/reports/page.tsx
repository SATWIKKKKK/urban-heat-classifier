import Link from 'next/link';
import { auth } from '@/lib/auth';
import { baselineMeasurements, cityZones, interventions } from '@/lib/data/seed';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

const reportTemplates = [
  { title: 'Monthly Impact Summary', description: 'Auto-generated overview of all intervention impacts, KPI changes, and budget utilization for the current month.', icon: 'summarize', lastRun: '2 days ago', status: 'Ready' },
  { title: 'Equity & Vulnerability Report', description: 'Detailed breakdown of heat exposure by demographic, ward-level vulnerability indices, and equity scores.', icon: 'diversity_3', lastRun: '1 week ago', status: 'Ready' },
  { title: 'Budget Allocation Analysis', description: 'Capital expenditure breakdown by intervention type, scenario comparison costs, and projected ROI.', icon: 'account_balance', lastRun: '3 days ago', status: 'Ready' },
  { title: 'Environmental Compliance', description: 'EPA/NOAA-aligned environmental impact statement for all active and planned interventions.', icon: 'eco', lastRun: 'Never', status: 'Draft' },
];

export default async function ReportsPage() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none"></div>
      <div className="fixed top-[-15%] right-[-5%] w-[500px] h-[500px] orb orb-secondary opacity-20 pointer-events-none"></div>
      <div className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] orb orb-primary opacity-15 pointer-events-none"></div>

      {/* Navbar */}
      <GlobalNavbar accentColor="var(--info)" activeHref="/reports"
        rightActions={
          <button className="px-4 py-2 text-xs bg-[var(--info)] text-white font-bold rounded-xl flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">add</span>
            Create Report
          </button>
        }
      />

      <main className="relative z-10 mx-auto max-w-7xl p-4 md:p-8 pb-24 md:pb-8 flex flex-col gap-8 pt-[76px]">
        {/* Page header */}
        <div className="animate-reveal-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--info)]/10 border border-[var(--info)]/20 mb-3">
            <span className="material-symbols-outlined text-sm text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
            <span className="text-[10px] font-bold text-[var(--info)] tracking-widest uppercase">Analytics</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter font-[family-name:var(--font-headline)]">Reports &amp; Exports</h1>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">Generate, schedule, and export analytic reports across all Urban Heat Mitigator datasets.</p>
        </div>

        {/* Report Templates */}
        <div className="stagger-children">
          <h2 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white mb-4">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportTemplates.map((t) => (
              <div key={t.title} className="glass-card rounded-xl p-6 hover:border-[var(--info)]/30 transition-all group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[var(--info)]/10 flex items-center justify-center text-[var(--info)] shrink-0 group-hover:bg-[var(--info)]/20 transition-all">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{t.title}</h3>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed">{t.description}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Last Run: {t.lastRun}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'Ready' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' : 'bg-[var(--high)]/10 text-[var(--high)]'}`}>{t.status}</span>
                    </div>
                  </div>
                  <button className="material-symbols-outlined text-[var(--text-tertiary)] hover:text-white transition-all p-2 hover:bg-[var(--bg-elevated)] rounded-xl">download</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Tables */}
        <div className="animate-reveal-up">
          <section className="glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-strong)]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Monthly Baseline Measurements</h3>
              <div className="flex gap-2">
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-all">CSV</button>
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-all">JSON</button>
                <button className="text-xs px-3 py-1.5 border border-white/10 rounded-lg text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-elevated)] transition-all">PDF</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Avg Temp (°F)</th>
                    <th className="px-6 py-4">Heat Index</th>
                    <th className="px-6 py-4">UHI Intensity</th>
                    <th className="px-6 py-4">Energy Use (MWh)</th>
                    <th className="px-6 py-4">ER Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-strong)]/10">
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
                      <td className={`px-6 py-3 font-bold ${uhi >= 8 ? 'text-[var(--critical)]' : uhi >= 5 ? 'text-[var(--high)]' : 'text-[var(--green-400)]'}`}>{uhi}°F</td>
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
            <div className="p-6 border-b border-[var(--border-strong)]/10">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Zone Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Zone</th>
                    <th className="px-6 py-4">Population</th>
                    <th className="px-6 py-4">Area (km²)</th>
                    <th className="px-6 py-4">Avg Temp</th>
                    <th className="px-6 py-4">Canopy %</th>
                    <th className="px-6 py-4">Vulnerability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-strong)]/10">
                  {cityZones.map((z) => {
                    const avgF = +(z.avgTemp * 9 / 5 + 32).toFixed(1);
                    return (
                    <tr key={z.id} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-3 font-semibold text-[#dee5ff]">{z.name}</td>
                      <td className="px-6 py-3">{z.populationDensity.toLocaleString()}</td>
                      <td className="px-6 py-3">{(z.populationDensity / 2800).toFixed(1)}</td>
                      <td className={`px-6 py-3 font-bold ${avgF >= 100 ? 'text-[var(--critical)]' : avgF >= 95 ? 'text-[var(--high)]' : 'text-[var(--green-400)]'}`}>{avgF}°F</td>
                      <td className="px-6 py-3">{z.treeCanopyPct}%</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          z.vulnerabilityScore >= 8 ? 'bg-[var(--critical)]/10 text-[var(--critical)]' :
                          z.vulnerabilityScore >= 6 ? 'bg-[var(--high)]/10 text-[var(--high)]' :
                          'bg-[var(--green-400)]/10 text-[var(--green-400)]'
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
            <div className="p-6 border-b border-[var(--border-strong)]/10">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white">Active Interventions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Intervention</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Zone</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Temp Reduction</th>
                    <th className="px-6 py-4">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-strong)]/10">
                  {interventions.map((i) => (
                    <tr key={i.id} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-3 font-semibold text-[#dee5ff]">{i.name}</td>
                      <td className="px-6 py-3 capitalize">{i.type.replace('_', ' ')}</td>
                      <td className="px-6 py-3">{i.zoneId}</td>
                      <td className="px-6 py-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                          i.status === 'completed' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                          i.status === 'in_progress' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
                          'bg-[var(--high)]/10 text-[var(--high)]'
                        }`}>{i.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-6 py-3 font-bold text-[var(--green-400)]">{(i.tempReduction * 1.8).toFixed(1)}°F</td>
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
          <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 ${item.href === '/reports' ? 'text-[var(--info)]' : 'text-[var(--text-tertiary)]'}`}>
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: item.href === '/reports' ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
