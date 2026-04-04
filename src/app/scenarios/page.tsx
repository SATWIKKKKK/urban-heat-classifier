'use client';

import TopNav from '@/components/layout/TopNav';
import SideNav from '@/components/layout/SideNav';
import MobileNav from '@/components/layout/MobileNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import Link from 'next/link';
import { scenarioPlanA, scenarioPlanB, interventionBreakdown } from '@/lib/data/seed';

export default function ScenariosPage() {
  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav />
      <SideNav activeItem="Infrastructure" />
      <MobileNav />

      <main className="md:ml-64 mt-16 p-4 md:p-8 min-h-screen pb-20 md:pb-8 flex flex-col gap-8">
        {/* Header */}
        <GSAPWrapper animation="slideUp">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="text-xs font-bold text-[#69f6b8] tracking-[0.2em] uppercase font-[var(--font-headline)]">Strategy Optimization</span>
              <h1 className="text-3xl md:text-4xl font-black text-white mt-2 tracking-tighter font-[var(--font-headline)]">Scenario Comparison</h1>
              <p className="text-[#a3aac4] mt-2 max-w-2xl">Detailed side-by-side analysis of mitigation strategies. Compare capital efficiency against social impact.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button className="px-6 py-3 border border-[#40485d] text-[#dee5ff] font-semibold rounded-md hover:bg-[#0f1930] transition-all">Save Current Session</button>
              <button className="px-6 py-3 bg-gradient-to-br from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-md shadow-xl active:scale-95 transition-all">Finalize &amp; Export Selected Plan</button>
            </div>
          </header>
        </GSAPWrapper>

        {/* Comparison Grid */}
        <GSAPWrapper animation="slideUp" delay={0.1} stagger>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan A */}
            <section className="glass-card rounded-xl overflow-hidden flex flex-col border border-white/5 relative">
              <div className="absolute top-4 right-4 bg-[#699cff]/20 text-[#699cff] px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest z-10">Scenario A</div>
              <div className="p-6 pb-0">
                <h3 className="text-2xl font-bold text-white tracking-tight font-[var(--font-headline)]">Budget Plan A</h3>
                <p className="text-[#a3aac4] text-sm mt-1">Focused on cost-effective retrofitting and high-density planting.</p>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Cooling Efficiency</span>
                    <div className="text-2xl font-black text-[#699cff]">{scenarioPlanA.coolingEfficiency}° <span className="text-xs font-normal text-slate-500">per $1M</span></div>
                  </div>
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Lives Saved</span>
                    <div className="text-2xl font-black text-white">{(scenarioPlanA.livesSaved / 1000).toFixed(1)}k</div>
                  </div>
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Imp. Speed</span>
                    <div className="text-2xl font-black text-white">{scenarioPlanA.implementationMonths}mo</div>
                  </div>
                </div>
                <div className="relative h-48 w-full bg-black rounded-lg mt-6 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#699cff]/20 via-transparent to-[#69f6b8]/10"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-[#192540]/90 backdrop-blur-md p-3 rounded-lg border border-[#40485d]/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-white uppercase">Capital Expenditure Utilization</span>
                      <span className="text-[10px] font-bold text-[#69f6b8]">82%</span>
                    </div>
                    <div className="w-full bg-black h-1.5 rounded-full">
                      <div className="h-full bg-[#69f6b8] rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Plan B */}
            <section className="glass-card rounded-xl overflow-hidden flex flex-col border border-white/5 relative">
              <div className="absolute top-4 right-4 bg-[#69f6b8]/20 text-[#69f6b8] px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest z-10">Scenario B</div>
              <div className="p-6 pb-0">
                <h3 className="text-2xl font-bold text-white tracking-tight font-[var(--font-headline)]">Max Impact Plan B</h3>
                <p className="text-[#a3aac4] text-sm mt-1">Aggressive green infrastructure with widespread vertical gardens.</p>
              </div>
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Cooling Efficiency</span>
                    <div className="text-2xl font-black text-[#ff8439]">{scenarioPlanB.coolingEfficiency}° <span className="text-xs font-normal text-slate-500">per $1M</span></div>
                  </div>
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Lives Saved</span>
                    <div className="text-2xl font-black text-white">{(scenarioPlanB.livesSaved / 1000).toFixed(1)}k</div>
                  </div>
                  <div className="bg-[#141f38] p-4 rounded-lg">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">Imp. Speed</span>
                    <div className="text-2xl font-black text-white">{scenarioPlanB.implementationMonths}mo</div>
                  </div>
                </div>
                <div className="relative h-48 w-full bg-black rounded-lg mt-6 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#ff8439]/20 via-transparent to-[#ff716c]/10"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-[#192540]/90 backdrop-blur-md p-3 rounded-lg border border-[#40485d]/20">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-white uppercase">Capital Expenditure Utilization</span>
                      <span className="text-[10px] font-bold text-[#ff8439]">144%</span>
                    </div>
                    <div className="w-full bg-black h-1.5 rounded-full">
                      <div className="h-full bg-[#ff8439] rounded-full w-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </GSAPWrapper>

        {/* AI Recommendation */}
        <GSAPWrapper animation="slideUp" delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-[#192540] to-[#0f1930] rounded-xl p-8 border border-[#69f6b8]/20 relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#69f6b8]/10 rounded-full blur-3xl group-hover:bg-[#69f6b8]/20 transition-all"></div>
              <div className="flex flex-col md:flex-row items-start gap-6 relative z-10">
                <div className="h-14 w-14 rounded-xl bg-[#69f6b8]/20 flex items-center justify-center text-[#69f6b8] shrink-0">
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <div>
                  <span className="px-2 py-0.5 bg-[#69f6b8] text-[#002919] text-[10px] font-bold rounded uppercase">AI Recommended</span>
                  <h4 className="text-2xl font-bold text-white mt-2 font-[var(--font-headline)]">Hybrid Resilience Model</h4>
                  <p className="text-[#a3aac4] mt-2 leading-relaxed">Our optimization engine suggests a blended approach. By reallocating 15% of the Plan B vertical gardening budget into Plan A&apos;s community retrofitting, you achieve 92% of the max impact with only 65% of the total budget.</p>
                  <div className="flex flex-wrap gap-8 md:gap-12 mt-8">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Projected Savings</div>
                      <div className="text-3xl font-black text-[#69f6b8]">$12.4M</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Cooling Score</div>
                      <div className="text-3xl font-black text-white">8.4/10</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500">Risk Profile</div>
                      <div className="text-3xl font-black text-[#699cff]">Minimal</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#141f38] rounded-xl p-6 border border-[#40485d]/10 flex flex-col justify-center gap-4">
              {[
                { label: 'Vulnerability Index Change', value: '-18%', color: '#69f6b8', width: '65%' },
                { label: 'Water Resource Impact', value: '+12%', color: '#ff8439', width: '40%' },
                { label: 'Social Equity Gain', value: '+24%', color: '#699cff', width: '78%' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                  <div className="h-2 w-full bg-black rounded-full overflow-hidden mt-1">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ backgroundColor: item.color, width: item.width }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GSAPWrapper>

        {/* Data Table */}
        <GSAPWrapper animation="slideUp" delay={0.3}>
          <section className="glass-card rounded-xl border border-white/5 overflow-hidden mb-12">
            <div className="p-6 border-b border-[#40485d]/10 flex justify-between items-center">
              <h3 className="font-[var(--font-headline)] font-bold text-xl text-white">Detailed Intervention Breakdown</h3>
              <div className="flex items-center gap-2">
                <button className="material-symbols-outlined p-2 text-slate-400 hover:text-white hover:bg-[#192540] rounded transition-all">filter_list</button>
                <button className="material-symbols-outlined p-2 text-slate-400 hover:text-white hover:bg-[#192540] rounded transition-all">download</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#141f38]/50 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                    <th className="px-6 py-4">Intervention Type</th>
                    <th className="px-6 py-4">Plan A (Units)</th>
                    <th className="px-6 py-4">Plan A (Cost)</th>
                    <th className="px-6 py-4">Plan B (Units)</th>
                    <th className="px-6 py-4">Plan B (Cost)</th>
                    <th className="px-6 py-4">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#40485d]/10">
                  {interventionBreakdown.map((row) => (
                    <tr key={row.type} className="hover:bg-[#192540] transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#dee5ff]">{row.type}</td>
                      <td className="px-6 py-4">{row.planAUnits.toLocaleString()}</td>
                      <td className="px-6 py-4">{row.planACost}</td>
                      <td className="px-6 py-4">{row.planBUnits.toLocaleString()}</td>
                      <td className="px-6 py-4">{row.planBCost}</td>
                      <td className={`px-6 py-4 font-bold ${row.varianceColor === 'primary' ? 'text-[#69f6b8]' : 'text-[#ff8439]'}`}>{row.variance}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-black font-bold text-white border-t border-[#40485d]/30">
                    <td className="px-6 py-5">Total Scenario Estimates</td>
                    <td className="px-6 py-5">-</td>
                    <td className="px-6 py-5 text-[#699cff]">$18.1M</td>
                    <td className="px-6 py-5">-</td>
                    <td className="px-6 py-5 text-[#ff8439]">$58.3M</td>
                    <td className="px-6 py-5">$40.2M Diff.</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </GSAPWrapper>
      </main>
    </div>
  );
}
