'use client';

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

const statusConfig: Record<string, { color: string; icon: string; stepIndex: number }> = {
  pending: { color: 'var(--high)', icon: 'hourglass_top', stepIndex: 0 },
  survey: { color: 'var(--info)', icon: 'location_searching', stepIndex: 1 },
  approved: { color: 'var(--green-400)', icon: 'verified', stepIndex: 2 },
  scheduled: { color: 'var(--info)', icon: 'calendar_month', stepIndex: 3 },
  planted: { color: 'var(--green-400)', icon: 'park', stepIndex: 4 },
  monitoring: { color: 'var(--green-400)', icon: 'monitor_heart', stepIndex: 5 },
};

export default function MyRequestsPage() {
  const plantedCount = treeRequests.filter((r) => r.status === 'planted').length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] grid-pattern relative overflow-hidden">
      <div className="orb orb-primary w-[500px] h-[500px] -top-[100px] -right-[100px] fixed" />
      <div className="orb orb-secondary w-[400px] h-[400px] bottom-[10%] -left-[100px] fixed" />

      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 glass-overlay border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/resident" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="font-bold text-white font-[family-name:var(--font-headline)] text-lg">HeatPlan</span>
            </Link>
            <span className="hidden sm:block h-5 w-px bg-white/10" />
            <span className="hidden sm:block text-xs text-[var(--text-secondary)]">My Requests</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/resident" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full glass-overlay border-t border-white/5 flex justify-around items-center h-16 z-50">
        <Link href="/resident" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">home</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/resident/request-tree" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">park</span>
          <span className="text-[10px] font-bold">Request</span>
        </Link>
        <Link href="/resident/my-requests" className="flex flex-col items-center gap-0.5 text-[var(--green-400)]">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
          <span className="text-[10px] font-bold">Requests</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">map</span>
          <span className="text-[10px] font-bold">Map</span>
        </Link>
      </div>

      <main className="pt-16 pb-20 md:pb-8 relative z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 animate-reveal-up">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-[family-name:var(--font-headline)]">My Requests</h1>
              <p className="text-[var(--text-secondary)] mt-2">Track all your submitted tree requests and their current status.</p>
            </div>
            <Link href="/resident/request-tree" className="px-6 py-3 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl shadow-lg shadow-[var(--green-400)]/20 transition-all flex items-center gap-2 ">
              <span className="material-symbols-outlined text-lg">add</span>
              New Request
            </Link>
          </div>

          {/* Impact Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 animate-reveal-up" style={{ animationDelay: '0.1s' }}>
            {[
              { label: 'Total Requests', value: treeRequests.length, icon: 'description', color: 'var(--info)' },
              { label: 'Trees Planted', value: plantedCount, icon: 'park', color: 'var(--green-400)' },
              { label: 'CO₂ Offset', value: '480 lbs', icon: 'co2', color: 'var(--green-400)' },
              { label: 'Cooling Impact', value: '1.2°F', icon: 'thermostat', color: 'var(--high)' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5 text-center group hover:scale-[1.02] transition-transform">
                <div className="h-10 w-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${stat.color}12` }}>
                  <span className="material-symbols-outlined text-xl" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                </div>
                <div className="text-xl font-black text-white">{stat.value}</div>
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1 block">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Request Lifecycle */}
          <div className="glass-card rounded-2xl p-6 mb-8 animate-reveal-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="font-bold text-white text-sm mb-4 font-[family-name:var(--font-headline)]">Request Lifecycle</h3>
            <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
              {requestLifecycle.map((stage, idx) => (
                <div key={stage.step} className="flex items-center gap-1 min-w-0">
                  <div className="flex flex-col items-center min-w-[64px]">
                    <div className="h-9 w-9 rounded-xl bg-[var(--bg-base)]/60 border border-white/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-[var(--text-tertiary)]">{stage.icon}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] mt-1.5 text-center font-semibold">{stage.step}</span>
                  </div>
                  {idx < requestLifecycle.length - 1 && (
                    <div className="h-px bg-[var(--bg-elevated)] flex-1 min-w-[12px]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Request Cards */}
          <div className="flex flex-col gap-4 mb-12 stagger-children">
            {treeRequests.map((request) => {
              const config = statusConfig[request.status] || statusConfig.pending;
              const progressPct = Math.round(((config.stepIndex + 1) / requestLifecycle.length) * 100);
              return (
                <div key={request.id} className="glass-card rounded-2xl overflow-hidden hover:border-white/10 transition-all group">
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row items-start gap-4">
                      {/* Status Icon */}
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${config.color}12` }}>
                        <span className="material-symbols-outlined text-2xl" style={{ color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                      </div>

                      {/* Request Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-white text-lg">{request.species}</h3>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider" style={{ backgroundColor: `${config.color}12`, color: config.color }}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{request.address}</p>
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[var(--text-tertiary)]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            {request.submittedDate}
                          </span>
                          {request.plantingDate && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">event</span>
                              Planting: {request.plantingDate}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">tag</span>
                            {request.id}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="mt-4">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span className="text-[var(--text-tertiary)]">Progress</span>
                            <span className="font-bold" style={{ color: config.color }}>{progressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-1000"
                              style={{ backgroundColor: config.color, width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button className="p-2 text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-elevated)] rounded-xl transition-all">
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button className="p-2 text-[var(--text-tertiary)] hover:text-white hover:bg-[var(--bg-elevated)] rounded-xl transition-all">
                          <span className="material-symbols-outlined text-lg">chat_bubble_outline</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  {request.status !== 'pending' && (
                    <div className="px-5 md:px-6 pb-4 pt-0">
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {requestLifecycle.slice(0, config.stepIndex + 1).map((stage, idx) => (
                          <div key={stage.step} className="flex items-center gap-1">
                            <div className="h-5 w-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                              <span className="material-symbols-outlined text-xs" style={{ color: config.color }}>check</span>
                            </div>
                            <span className="text-[10px] text-[var(--text-tertiary)] whitespace-nowrap">{stage.step}</span>
                            {idx < config.stepIndex && (
                              <div className="w-4 h-px" style={{ backgroundColor: `${config.color}30` }} />
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
        </div>
      </main>
    </div>
  );
}
