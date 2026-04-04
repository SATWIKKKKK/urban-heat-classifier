'use client';

import TopNav from '@/components/layout/TopNav';
import MobileNav from '@/components/layout/MobileNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import AnimatedCounter from '@/components/shared/AnimatedCounter';
import Link from 'next/link';
import { treeRequests } from '@/lib/data/seed';

const requestLifecycle = [
  { step: 'Submitted', icon: 'edit_note', desc: 'Request received' },
  { step: 'Site Survey', icon: 'location_searching', desc: 'Arborist assessment' },
  { step: 'Approved', icon: 'verified', desc: 'Plan confirmed' },
  { step: 'Scheduled', icon: 'calendar_month', desc: 'Date assigned' },
  { step: 'Planted', icon: 'park', desc: 'Tree in ground' },
  { step: 'Monitoring', icon: 'monitor_heart', desc: 'Growth tracking' },
];

const statusConfig: Record<string, { color: string; bg: string; icon: string; stepIndex: number }> = {
  pending: { color: '#ff8439', bg: '#ff8439', icon: 'hourglass_top', stepIndex: 0 },
  survey: { color: '#699cff', bg: '#699cff', icon: 'location_searching', stepIndex: 1 },
  approved: { color: '#69f6b8', bg: '#69f6b8', icon: 'verified', stepIndex: 2 },
  scheduled: { color: '#699cff', bg: '#699cff', icon: 'calendar_month', stepIndex: 3 },
  planted: { color: '#69f6b8', bg: '#69f6b8', icon: 'park', stepIndex: 4 },
  monitoring: { color: '#69f6b8', bg: '#69f6b8', icon: 'monitor_heart', stepIndex: 5 },
};

const residentSideLinks = [
  { label: 'Portal Home', href: '/resident', icon: 'home' },
  { label: 'Request a Tree', href: '/resident/request-tree', icon: 'park' },
  { label: 'My Requests', href: '/resident/my-requests', icon: 'assignment', active: true },
  { label: 'Report Heat Issue', href: '#', icon: 'report' },
  { label: 'Cooling Centers', href: '#', icon: 'ac_unit' },
  { label: 'Community Events', href: '#', icon: 'event' },
];

export default function MyRequestsPage() {
  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav variant="resident" />
      <MobileNav />

      <div className="flex mt-16">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 fixed top-16 left-0 bottom-0 bg-[#0a1628] border-r border-[#40485d]/10 p-4 overflow-y-auto z-30">
          <div className="flex flex-col gap-1">
            {residentSideLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  link.active
                    ? 'bg-[#69f6b8]/10 text-[#69f6b8]'
                    : 'text-[#a3aac4] hover:bg-[#192540] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg" style={link.active ? { fontVariationSettings: "'FILL' 1" } : {}}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <GSAPWrapper animation="slideUp">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                  <Link href="/resident" className="text-xs text-[#69f6b8] hover:underline flex items-center gap-1 mb-3">
                    <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Portal
                  </Link>
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter font-[var(--font-headline)]">My Requests</h1>
                  <p className="text-[#a3aac4] mt-2">Track all your submitted tree requests and their current status.</p>
                </div>
                <Link href="/resident/request-tree" className="px-6 py-3 bg-gradient-to-br from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-md shadow-xl active:scale-95 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">add</span>
                  New Request
                </Link>
              </div>
            </GSAPWrapper>

            {/* Personal Impact */}
            <GSAPWrapper animation="slideUp" delay={0.1} stagger>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Requests', value: treeRequests.length, icon: 'description', color: '#699cff' },
                  { label: 'Trees Planted', value: treeRequests.filter((r) => r.status === 'planted').length, icon: 'park', color: '#69f6b8' },
                  { label: 'CO₂ Offset (lbs)', value: 480, icon: 'co2', color: '#69f6b8' },
                  { label: 'Cooling Impact', value: 1.2, suffix: '°F', icon: 'thermostat', color: '#ff8439', decimals: 1 },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card-hover rounded-xl p-5 text-center">
                    <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                    <div className="text-2xl font-black text-white">
                      <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} decimals={stat.decimals || 0} />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 block">{stat.label}</span>
                  </div>
                ))}
              </div>
            </GSAPWrapper>

            {/* Request Lifecycle */}
            <GSAPWrapper animation="slideUp" delay={0.15}>
              <div className="glass-card rounded-xl p-6 mb-8">
                <h3 className="font-bold text-white text-sm mb-4">Request Lifecycle</h3>
                <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
                  {requestLifecycle.map((stage, idx) => (
                    <div key={stage.step} className="flex items-center gap-1 min-w-0">
                      <div className="flex flex-col items-center min-w-[64px]">
                        <div className="h-8 w-8 rounded-full bg-[#141f38] border border-[#40485d]/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-slate-400">{stage.icon}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 text-center">{stage.step}</span>
                      </div>
                      {idx < requestLifecycle.length - 1 && (
                        <div className="h-px bg-[#40485d]/30 flex-1 min-w-[12px]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </GSAPWrapper>

            {/* Request Cards */}
            <GSAPWrapper animation="slideUp" delay={0.2} stagger>
              <div className="flex flex-col gap-4 mb-12">
                {treeRequests.map((request) => {
                  const config = statusConfig[request.status] || statusConfig.pending;
                  return (
                    <div key={request.id} className="glass-card rounded-xl overflow-hidden hover:border-[#40485d]/30 transition-all">
                      <div className="p-6">
                        <div className="flex flex-col md:flex-row items-start gap-4">
                          {/* Status Icon */}
                          <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.bg}15` }}>
                            <span className="material-symbols-outlined text-2xl" style={{ color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                          </div>

                          {/* Request Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-white text-lg">{request.species}</h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: `${config.bg}15`, color: config.color }}>
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-[#a3aac4] mt-1">{request.address}</p>
                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                Submitted: {request.submittedDate}
                              </span>
                              {request.plantingDate && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">event</span>
                                  Planting: {request.plantingDate}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">tag</span>
                                ID: {request.id}
                              </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="text-slate-500">Progress</span>
                                <span className="font-bold" style={{ color: config.color }}>
                                  {Math.round(((config.stepIndex + 1) / requestLifecycle.length) * 100)}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-[#141f38] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{
                                    backgroundColor: config.color,
                                    width: `${((config.stepIndex + 1) / requestLifecycle.length) * 100}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-[#192540] rounded-lg transition-all">
                              <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-[#192540] rounded-lg transition-all">
                              <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Timeline - shown for some requests */}
                      {request.status !== 'pending' && (
                        <div className="px-6 pb-4 pt-0">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {requestLifecycle.slice(0, config.stepIndex + 1).map((stage, idx) => (
                              <div key={stage.step} className="flex items-center gap-1">
                                <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.color}20` }}>
                                  <span className="material-symbols-outlined text-xs" style={{ color: config.color }}>check</span>
                                </div>
                                <span className="text-[10px] text-slate-500 whitespace-nowrap">{stage.step}</span>
                                {idx < config.stepIndex && (
                                  <div className="w-4 h-px" style={{ backgroundColor: `${config.color}40` }}></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GSAPWrapper>
          </div>
        </main>
      </div>
    </div>
  );
}
