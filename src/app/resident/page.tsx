import Link from 'next/link';
import { auth } from '@/lib/auth';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

const liveAlerts = [
  { level: 'Extreme', title: 'Extreme Heat Warning', desc: 'Heat index expected to reach 115°F in downtown core. Cooling centers activated.', time: '2 hours ago', color: 'var(--critical)', icon: 'emergency_heat' },
  { level: 'Advisory', title: 'Air Quality Advisory', desc: 'Ozone levels elevated in industrial corridor. Limit outdoor activity.', time: '5 hours ago', color: 'var(--high)', icon: 'air' },
  { level: 'Info', title: 'New Cool Pavement Project', desc: 'Phase 2 of the Riverside cool pavement initiative begins next week.', time: '1 day ago', color: 'var(--info)', icon: 'construction' },
];

const impactStats = [
  { label: 'Trees Planted', value: '2,847', icon: 'park', color: 'var(--green-400)' },
  { label: 'Active Requests', value: '156', icon: 'pending_actions', color: 'var(--info)' },
  { label: 'Temp Reduction', value: '3.2°F', icon: 'thermostat', color: 'var(--high)' },
  { label: 'Members', value: '12.4K', icon: 'groups', color: '#c084fc' },
];

const quickActions = [
  { title: 'Request a Tree', desc: 'Free tree planting for your property or nearby public space.', href: '/resident/request-tree', icon: 'park', color: 'var(--green-400)', cta: 'Get Started' },
  { title: 'My Requests', desc: 'Track status and estimated timelines for your submissions.', href: '/resident/my-requests', icon: 'assignment', color: 'var(--info)', cta: 'View All' },
  { title: 'Report Heat Issue', desc: 'Report heat hazards, broken infrastructure, or shade needs.', href: '#', icon: 'report', color: 'var(--high)', cta: 'Report Now' },
  { title: 'Explore Map', desc: 'See heat islands, tree coverage, and planned interventions.', href: '/map', icon: 'map', color: '#c084fc', cta: 'Open Map' },
];

const safetyTips = [
  { title: 'Stay Hydrated', desc: 'Drink water before you feel thirsty. Avoid alcohol and caffeine.', icon: 'water_drop' },
  { title: 'Find Cool Spaces', desc: 'Visit libraries, malls, or cooling centers on our map.', icon: 'ac_unit' },
  { title: 'Check on Neighbors', desc: 'Elderly and children are most vulnerable to extreme heat.', icon: 'volunteer_activism' },
  { title: 'Limit Outdoor Activity', desc: 'Avoid strenuous activity between 10 AM and 4 PM.', icon: 'do_not_disturb_on' },
];

export default async function ResidentPage() {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] grid-pattern relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="orb orb-primary w-[600px] h-[600px] -top-[200px] -right-[150px] fixed" />
      <div className="orb orb-secondary w-[400px] h-[400px] bottom-[10%] -left-[100px] fixed" />
      <div className="orb w-[300px] h-[300px] top-[60%] right-[10%] fixed" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.08), transparent 70%)' }} />

      {/* Navbar */}
      <GlobalNavbar activeHref="/resident" />

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 w-full glass-overlay border-t border-white/5 flex justify-around items-center h-16 z-50">
        <Link href="/resident" className="flex flex-col items-center gap-0.5 text-[var(--green-400)]">
          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link href="/resident/request-tree" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">park</span>
          <span className="text-[10px] font-bold">Request</span>
        </Link>
        <Link href="/resident/my-requests" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">assignment</span>
          <span className="text-[10px] font-bold">Requests</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-0.5 text-[var(--text-tertiary)]">
          <span className="material-symbols-outlined text-xl">map</span>
          <span className="text-[10px] font-bold">Map</span>
        </Link>
      </div>

      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-8 relative z-10">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
            <div className="max-w-2xl animate-reveal-up">
              <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-5">
                <span className="h-2 w-2 rounded-full bg-[var(--green-400)] animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--green-400)]">Civic Engagement Portal</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white font-[family-name:var(--font-headline)] tracking-tight leading-[1.1]">
                Cool Your<br /><span className="text-gradient-primary">Place</span>
              </h1>
              <p className="text-[var(--text-secondary)] mt-5 text-lg max-w-xl leading-relaxed">
                Request trees, report heat issues, and track how your community fights the urban heat island effect.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link href="/resident/request-tree" className="px-8 py-4 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl shadow-lg shadow-[var(--green-400)]/20 hover:shadow-xl hover:shadow-[var(--green-400)]/30 transition-all text-center ">
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
                    Request a Tree
                  </span>
                </Link>
                <Link href="/map" className="px-8 py-4 glass-card rounded-xl font-semibold text-white hover:border-white/15 transition-all text-center">
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">map</span>
                    Explore Map
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Impact Stats */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 -mt-4 animate-reveal-up" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {impactStats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5 text-center group hover:scale-[1.02] transition-transform">
                <div className="h-11 w-11 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${stat.color}12` }}>
                  <span className="material-symbols-outlined text-2xl" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                </div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1 block">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Live Alerts */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8 animate-reveal-up" style={{ animationDelay: '0.15s' }}>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--critical)] animate-pulse" />
                <h3 className="font-bold text-white text-sm font-[family-name:var(--font-headline)]">Live Alerts</h3>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{liveAlerts.length} Active</span>
            </div>
            <div className="divide-y divide-white/5">
              {liveAlerts.map((alert) => (
                <div key={alert.title} className="p-4 flex items-start gap-4 hover:bg-white/[0.02] transition-all cursor-pointer group">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${alert.color}12` }}>
                    <span className="material-symbols-outlined text-xl" style={{ color: alert.color, fontVariationSettings: "'FILL' 1" }}>{alert.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider" style={{ backgroundColor: `${alert.color}12`, color: alert.color }}>{alert.level}</span>
                      <span className="font-semibold text-white text-sm">{alert.title}</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs mt-1 leading-relaxed">{alert.desc}</p>
                  </div>
                  <span className="text-[10px] text-[var(--border-strong)] whitespace-nowrap shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8 animate-reveal-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-[family-name:var(--font-headline)] font-bold text-xl text-white mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="glass-card rounded-2xl p-5 group hover:scale-[1.02] transition-all relative overflow-hidden block"
              >
                <div className="relative z-10">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-all" style={{ backgroundColor: `${action.color}12` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: action.color, fontVariationSettings: "'FILL' 1" }}>{action.icon}</span>
                  </div>
                  <h3 className="font-bold text-white text-base">{action.title}</h3>
                  <p className="text-[var(--text-tertiary)] text-xs mt-1.5 leading-relaxed">{action.desc}</p>
                  <span className="text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all" style={{ color: action.color }}>
                    {action.cta}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Initiative + Safety Tips */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 mt-8 mb-8 animate-reveal-up" style={{ animationDelay: '0.25s' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Initiative Card */}
            <div className="glass-card rounded-2xl overflow-hidden glow-secondary">
              <div className="relative h-44 bg-gradient-to-br from-[var(--info)]/15 via-[var(--bg-base)] to-[var(--green-400)]/8 flex items-center justify-center">
                <div className="text-center">
                  <span className="material-symbols-outlined text-6xl text-[var(--info)]/25" style={{ fontVariationSettings: "'FILL' 1" }}>road</span>
                  <p className="text-xs text-[var(--border-strong)] mt-2">Riverside Cool Pavement — Phase 2</p>
                </div>
              </div>
              <div className="p-6">
                <span className="text-[10px] font-bold text-[var(--info)] tracking-widest uppercase">Featured Initiative</span>
                <h3 className="font-bold text-white text-xl mt-2 font-[family-name:var(--font-headline)]">Cool Pavement Initiative</h3>
                <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">Reflective coatings reduce surface temps by 10-12°F. Phase 2 covers 15 miles of residential streets.</p>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--text-tertiary)]">Progress</span>
                      <span className="font-bold text-[var(--info)]">64%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--info)] rounded-full" style={{ width: '64%' }} />
                    </div>
                  </div>
                  <button className="px-4 py-2 text-xs font-bold glass-card rounded-lg text-[var(--info)] hover:border-[var(--info)]/30 transition-all">Learn More</button>
                </div>
              </div>
            </div>

            {/* Safety Tips */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--high)]" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                Heat Safety Tips
              </h3>
              <div className="flex flex-col gap-3 stagger-children">
                {safetyTips.map((tip) => (
                  <div key={tip.title} className="flex items-start gap-3 bg-[var(--bg-base)]/40 p-4 rounded-xl border border-white/3 hover:border-white/8 transition-all">
                    <span className="material-symbols-outlined text-[var(--green-400)] text-xl shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{tip.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{tip.title}</h4>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
