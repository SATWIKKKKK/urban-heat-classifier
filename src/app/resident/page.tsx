'use client';

import Link from 'next/link';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import TopNav from '@/components/layout/TopNav';
import MobileNav from '@/components/layout/MobileNav';
import { useState } from 'react';

const liveAlerts = [
  { level: 'Extreme', title: 'Extreme Heat Warning', desc: 'Heat index expected to reach 115°F in downtown core. Cooling centers activated.', time: '2 hours ago', color: '#ff716c', icon: 'emergency_heat' },
  { level: 'Advisory', title: 'Air Quality Advisory', desc: 'Ozone levels elevated in industrial corridor. Limit outdoor activity.', time: '5 hours ago', color: '#ff8439', icon: 'air' },
  { level: 'Info', title: 'New Cool Pavement Project', desc: 'Phase 2 of the Riverside cool pavement initiative begins next week.', time: '1 day ago', color: '#699cff', icon: 'construction' },
];

const impactStats = [
  { label: 'Trees Planted via Portal', value: '2,847', icon: 'park', color: '#69f6b8' },
  { label: 'Active Requests', value: '156', icon: 'pending_actions', color: '#699cff' },
  { label: 'Temp Reduction Achieved', value: '3.2°F', icon: 'thermostat', color: '#ff8439' },
  { label: 'Community Members', value: '12.4K', icon: 'groups', color: '#69f6b8' },
];

const safetyTips = [
  { title: 'Stay Hydrated', desc: 'Drink water before you feel thirsty. Avoid alcohol and caffeine during extreme heat.', icon: 'water_drop' },
  { title: 'Find Cool Spaces', desc: 'Visit libraries, malls, or cooling centers. Check our map for nearest locations.', icon: 'ac_unit' },
  { title: 'Check on Neighbors', desc: 'Elderly and young children are most vulnerable. Make sure they have access to cooling.', icon: 'volunteer_activism' },
  { title: 'Limit Outdoor Activity', desc: 'Avoid strenuous activity between 10 AM and 4 PM on high-heat days.', icon: 'do_not_disturb_on' },
];

export default function ResidentPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav variant="resident" />
      <MobileNav />

      <main className="mt-16 min-h-screen pb-20 md:pb-8">
        {/* Hero Section */}
        <GSAPWrapper animation="fadeIn">
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#69f6b8]/10 via-[#060e20] to-[#699cff]/10"></div>
            <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
              <div className="max-w-2xl">
                <span className="text-xs font-bold text-[#69f6b8] tracking-[0.2em] uppercase font-[var(--font-headline)]">Civic Engagement Portal</span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mt-3 tracking-tighter font-[var(--font-headline)] leading-tight">
                  Cool Your<br />Neighborhood
                </h1>
                <p className="text-[#a3aac4] mt-4 text-lg max-w-xl leading-relaxed">Request trees, report heat issues, and track how your community is fighting the urban heat island effect.</p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                    <input
                      type="text"
                      placeholder="Search for services, resources..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-[#0f1930] border border-[#40485d]/30 rounded-xl text-[#dee5ff] placeholder:text-slate-500 focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                    />
                  </div>
                  <Link href="/resident/request-tree" className="px-8 py-4 bg-gradient-to-br from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl shadow-xl hover:shadow-2xl active:scale-95 transition-all text-center whitespace-nowrap">
                    Request a Tree
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Live Alerts */}
        <GSAPWrapper animation="slideUp" delay={0.1}>
          <section className="max-w-6xl mx-auto px-4 md:px-8 -mt-4">
            <div className="bg-[#0f1930] rounded-xl border border-[#40485d]/10 overflow-hidden">
              <div className="p-4 border-b border-[#40485d]/10 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff716c] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_active</span>
                <h3 className="font-bold text-white text-sm">Live Alerts &amp; Advisories</h3>
              </div>
              <div className="divide-y divide-[#40485d]/10">
                {liveAlerts.map((alert) => (
                  <div key={alert.title} className="p-4 flex items-start gap-4 hover:bg-[#192540] transition-all cursor-pointer">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${alert.color}15` }}>
                      <span className="material-symbols-outlined" style={{ color: alert.color, fontVariationSettings: "'FILL' 1" }}>{alert.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${alert.color}15`, color: alert.color }}>{alert.level}</span>
                        <span className="font-semibold text-white text-sm">{alert.title}</span>
                      </div>
                      <p className="text-[#a3aac4] text-xs mt-1">{alert.desc}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">{alert.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Impact Stats */}
        <GSAPWrapper animation="slideUp" delay={0.2} stagger>
          <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
            <h2 className="font-[var(--font-headline)] font-bold text-xl text-white mb-4">Community Impact Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {impactStats.map((stat) => (
                <div key={stat.label} className="glass-card-hover rounded-xl p-5 text-center">
                  <span className="material-symbols-outlined text-3xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <span className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 block">{stat.label}</span>
                </div>
              ))}
            </div>
          </section>
        </GSAPWrapper>

        {/* Quick Actions */}
        <GSAPWrapper animation="slideUp" delay={0.3}>
          <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link href="/resident/request-tree" className="bg-gradient-to-br from-[#192540] to-[#0f1930] rounded-xl p-6 border border-[#69f6b8]/20 hover:border-[#69f6b8]/40 transition-all group cursor-pointer block">
                <div className="h-12 w-12 rounded-xl bg-[#69f6b8]/10 flex items-center justify-center text-[#69f6b8] mb-4 group-hover:bg-[#69f6b8]/20 transition-all">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
                </div>
                <h3 className="font-bold text-white text-lg">Request a Tree</h3>
                <p className="text-[#a3aac4] text-sm mt-2">Submit a request for tree planting on your property or nearby public space.</p>
                <span className="text-[#69f6b8] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
              </Link>

              <Link href="/resident/my-requests" className="bg-gradient-to-br from-[#192540] to-[#0f1930] rounded-xl p-6 border border-[#699cff]/20 hover:border-[#699cff]/40 transition-all group cursor-pointer block">
                <div className="h-12 w-12 rounded-xl bg-[#699cff]/10 flex items-center justify-center text-[#699cff] mb-4 group-hover:bg-[#699cff]/20 transition-all">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
                </div>
                <h3 className="font-bold text-white text-lg">My Requests</h3>
                <p className="text-[#a3aac4] text-sm mt-2">Track the status of your submitted requests and see estimated timelines.</p>
                <span className="text-[#699cff] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">View Requests <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
              </Link>

              <div className="bg-gradient-to-br from-[#192540] to-[#0f1930] rounded-xl p-6 border border-[#ff8439]/20 hover:border-[#ff8439]/40 transition-all group cursor-pointer">
                <div className="h-12 w-12 rounded-xl bg-[#ff8439]/10 flex items-center justify-center text-[#ff8439] mb-4 group-hover:bg-[#ff8439]/20 transition-all">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>report</span>
                </div>
                <h3 className="font-bold text-white text-lg">Report Heat Issue</h3>
                <p className="text-[#a3aac4] text-sm mt-2">Report broken cooling infrastructure, heat hazards, or areas needing shade.</p>
                <span className="text-[#ff8439] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">Report Now <span className="material-symbols-outlined text-sm">arrow_forward</span></span>
              </div>
            </div>
          </section>
        </GSAPWrapper>

        {/* Cool Pavement Initiative + Safety Tips */}
        <GSAPWrapper animation="slideUp" delay={0.4} stagger>
          <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Initiative Card */}
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="relative h-48 bg-gradient-to-br from-[#699cff]/20 via-[#060e20] to-[#69f6b8]/10 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-[#699cff]/40" style={{ fontVariationSettings: "'FILL' 1" }}>road</span>
                    <p className="text-xs text-slate-500 mt-2">Riverside Cool Pavement — Phase 2</p>
                  </div>
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-bold text-[#699cff] tracking-widest uppercase">Featured Initiative</span>
                  <h3 className="font-bold text-white text-xl mt-2 font-[var(--font-headline)]">Cool Pavement Initiative</h3>
                  <p className="text-[#a3aac4] text-sm mt-2 leading-relaxed">Reflective pavement coatings reduce surface temperatures by up to 10-12°F. Phase 2 covers 15 miles of residential streets in high-vulnerability zones.</p>
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Progress</span>
                        <span className="font-bold text-[#699cff]">64%</span>
                      </div>
                      <div className="h-2 bg-black rounded-full overflow-hidden">
                        <div className="h-full bg-[#699cff] rounded-full" style={{ width: '64%' }}></div>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-xs font-bold bg-[#699cff]/10 text-[#699cff] rounded hover:bg-[#699cff]/20 transition-all">Learn More</button>
                  </div>
                </div>
              </div>

              {/* Safety Tips */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-[var(--font-headline)] font-bold text-lg text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ff8439]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                  Heat Safety Tips
                </h3>
                <div className="flex flex-col gap-4">
                  {safetyTips.map((tip) => (
                    <div key={tip.title} className="flex items-start gap-3 bg-[#141f38] p-4 rounded-lg">
                      <span className="material-symbols-outlined text-[#69f6b8] text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{tip.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                        <p className="text-xs text-[#a3aac4] mt-0.5">{tip.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </GSAPWrapper>
      </main>
    </div>
  );
}
