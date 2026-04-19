import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

const demoCities = [
  { name: 'Delhi NCR', status: 'Live heat map', neighborhoods: 12, interventions: 10, accent: 'var(--green-400)', icon: 'location_city' },
  { name: 'Mumbai', status: 'Scenario planning', neighborhoods: 9, interventions: 14, accent: 'var(--info)', icon: 'wb_sunny' },
  { name: 'Chennai', status: 'Council review', neighborhoods: 11, interventions: 8, accent: 'var(--high)', icon: 'thermostat' },
];

const features = [
  { title: 'Map Vulnerability', desc: 'Identify neighborhoods with highest heat exposure using real temperature data and demographics.', icon: 'map', color: 'var(--critical)' },
  { title: 'Plan Interventions', desc: 'Place trees, green roofs, cool pavement, and urban parks directly on the map with cost estimates.', icon: 'construction', color: 'var(--green-400)' },
  { title: 'Simulate Impact', desc: 'Run EPA-based simulations to estimate cooling, lives saved, and CO2 reductions.', icon: 'analytics', color: 'var(--info)' },
  { title: 'Council Approval', desc: 'Submit scenarios to city council with auto-generated reports and budget breakdowns.', icon: 'how_to_vote', color: 'var(--high)' },
];

const stats = [
  { label: 'Cities', value: '3+', icon: 'apartment' },
  { label: 'Neighborhoods Mapped', value: '27', icon: 'grid_view' },
  { label: 'Interventions Planned', value: '156', icon: 'eco' },
  { label: 'Lives Protected/Year', value: '890+', icon: 'favorite' },
];

const timelineSteps = [
  { step: '01', title: 'Sign Up & Onboard', desc: 'Create your city account, set up wards, and invite your team members.', icon: 'person_add', color: 'var(--green-400)' },
  { step: '02', title: 'Map Heat Zones', desc: 'Import temperature data and map vulnerable neighborhoods using satellite imagery.', icon: 'satellite_alt', color: 'var(--info)' },
  { step: '03', title: 'Plan Interventions', desc: 'Place cooling interventions — trees, green roofs, cool pavements — with cost estimates.', icon: 'forest', color: 'var(--high)' },
  { step: '04', title: 'Simulate & Approve', desc: 'Run simulations to see projected impact, then route for multi-level approval.', icon: 'rocket_launch', color: 'var(--critical)' },
];

const indiaCrisisStats = [
  { label: 'Heat Wave Deaths (2010–2023)', value: '11,000+', icon: 'local_hospital' },
  { label: 'Cities Above 45°C Regularly', value: '30+', icon: 'device_thermostat' },
  { label: 'Urban Population Exposed', value: '500M+', icon: 'groups' },
  { label: 'Economic Loss / Year', value: '₹32,000 Cr', icon: 'trending_down' },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-white overflow-hidden relative">
      {/* Decorative orbs */}
      <div className="orb orb-primary w-[600px] h-[600px] -top-[200px] -left-[200px] fixed" />
      <div className="orb orb-secondary w-[500px] h-[500px] top-[40%] -right-[150px] fixed" />
      <div className="orb orb-tertiary w-[400px] h-[400px] bottom-[10%] left-[20%] fixed" />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center grid-pattern">
        <div className="noise-bg absolute inset-0" />
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 relative z-10">
          <div className="grid items-center gap-16 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Left Hero Content */}
            <div className="animate-reveal-up">
              <div className="inline-flex items-center gap-2 rounded-full glass-card px-5 py-2.5 mb-8">
                <span className="material-symbols-outlined text-[var(--green-400)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--green-400)]">HeatPlan</span>
                <span className="h-1 w-1 rounded-full bg-[var(--green-400)]/40" />
                <span className="text-xs text-[var(--text-secondary)]">Urban Climate Action</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-[-0.04em] font-[family-name:var(--font-headline)]">
                <span className="text-white">Fight</span><br />
                <span className="text-gradient-primary">Urban Heat</span><br />
                <span className="text-[var(--text-secondary)]">Together</span>
              </h1>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-[var(--text-secondary)]">
                Map vulnerable neighborhoods, plan interventions, simulate impact,
                and get city council approval — all in one platform.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-2xl shadow-lg shadow-[var(--green-400)]/20 transition-all hover:shadow-xl hover:shadow-[var(--green-400)]/30 hover:-translate-y-0.5 active:scale-[0.98] "
                >
                  <span className="flex items-center gap-2">
                    Get Started — Free
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </span>
                </Link>
              </div>

              <p className="mt-6 text-sm text-[var(--text-tertiary)]">
                Already have an account?{' '}
                <Link href="/login" className="text-[var(--green-400)] hover:underline font-semibold underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Right - Cities Card */}
            <div className="animate-reveal-up" style={{ animationDelay: '0.15s' }}>
              <div className="glass-card rounded-3xl p-8 glow-primary relative overflow-hidden">
                <div className="shimmer-bg absolute inset-0 rounded-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>language</span>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--green-400)]">Cities using HeatPlan</span>
                  </div>

                  <div className="space-y-3 stagger-children">
                    {demoCities.map((city) => (
                      <div key={city.name} className="flex items-center justify-between rounded-2xl glass-card px-5 py-4 hover:border-[var(--border-strong)] transition-all group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${city.accent}15` }}>
                            <span className="material-symbols-outlined" style={{ color: city.accent, fontVariationSettings: "'FILL' 1" }}>{city.icon}</span>
                          </div>
                          <div>
                            <div className="text-base font-bold text-white group-hover:text-[var(--green-400)] transition-colors">{city.name}</div>
                            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
                              <span>{city.neighborhoods} neighborhoods</span>
                              <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                              <span>{city.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-3 w-3 rounded-full pulse-ring" style={{ backgroundColor: city.accent }} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl bg-[var(--bg-surface)]/50 border border-[var(--border)] p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--info)] mb-3">How it works</div>
                    <div className="space-y-2">
                      {['Sign up & onboard', 'Map heat zones', 'Plan interventions', 'Simulate & approve'].map((step, i) => (
                        <div key={step} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                          <span className="w-5 h-5 rounded-full bg-[var(--green-400)]/15 text-[var(--green-400)] flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 border-y border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger-children">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="material-symbols-outlined text-2xl text-[var(--green-400)] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                <div className="text-3xl md:text-4xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
                <div className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* India Urban Heat Crisis Section */}
      <section className="relative z-10 py-24 border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--critical)]">The Crisis</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3 font-[family-name:var(--font-headline)] tracking-tight">
              India&apos;s Urban Heat Emergency
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
              India faces some of the world&apos;s deadliest heat waves. Rapid urbanization, shrinking green cover, and the concrete heat-island effect put hundreds of millions at risk every summer.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {indiaCrisisStats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5 text-center">
                <span className="material-symbols-outlined text-2xl text-[var(--critical)] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                <div className="text-2xl md:text-3xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-6 md:p-8 max-w-3xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-[var(--critical)]/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[var(--critical)] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Why India Needs HeatPlan</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Indian cities like Delhi, Nagpur, and Ahmedabad regularly cross 47°C. Traditional planning lacks data-driven heat mapping. HeatPlan bridges this gap — enabling municipal commissioners, ward officers, and SDMA observers to collaboratively plan and approve cooling interventions using real-time heat vulnerability data tailored for Indian urban contexts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline: How it Works */}
      <section className="relative z-10 py-24 border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--green-400)]">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3 font-[family-name:var(--font-headline)] tracking-tight">
              Four steps to a cooler city
            </h2>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--green-400)]/40 via-[var(--info)]/40 to-[var(--critical)]/40" />

            <div className="space-y-12 md:space-y-0">
              {timelineSteps.map((item, idx) => (
                <div key={item.step} className={`md:flex items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} mb-12`}>
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className={`glass-card-hover rounded-2xl p-6 inline-block max-w-md ${idx % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'}`}>
                      <div className="flex items-center gap-3 mb-3" style={{ flexDirection: idx % 2 === 0 ? 'row-reverse' : 'row' }}>
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                          <span className="material-symbols-outlined" style={{ color: item.color, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: item.color }}>Step {item.step}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                      <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div className="hidden md:flex w-10 h-10 rounded-full border-2 items-center justify-center shrink-0 z-10 bg-[var(--bg-base)]" style={{ borderColor: item.color }}>
                    <span className="text-xs font-black" style={{ color: item.color }}>{item.step}</span>
                  </div>

                  <div className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--info)]">Platform Features</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3 font-[family-name:var(--font-headline)] tracking-tight">
              Everything your city needs
            </h2>
            <p className="text-[var(--text-secondary)] mt-4 max-w-2xl mx-auto">
              From data collection to council approval, HeatPlan handles the entire urban heat mitigation workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
            {features.map((feature) => (
              <div key={feature.title} className="glass-card-hover rounded-2xl p-6 group relative overflow-hidden">
                <div className="shimmer-bg absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110" style={{ backgroundColor: `${feature.color}12` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: feature.color, fontVariationSettings: "'FILL' 1" }}>{feature.icon}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2 font-[family-name:var(--font-headline)]">{feature.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="glass-card rounded-3xl p-12 md:p-16 relative overflow-hidden glow-primary">
            <div className="shimmer-bg absolute inset-0 rounded-3xl" />
            <div className="relative z-10">
              <span className="material-symbols-outlined text-5xl text-[var(--green-400)] mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <h2 className="text-3xl md:text-5xl font-black text-white font-[family-name:var(--font-headline)] tracking-tight">
                Ready to cool your city?
              </h2>
              <p className="text-[var(--text-secondary)] mt-4 text-lg max-w-xl mx-auto">
                Join cities across India using data-driven heat mitigation planning. Get started in under 15 minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="px-10 py-4 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-2xl shadow-lg shadow-[var(--green-400)]/20 hover:shadow-xl hover:shadow-[var(--green-400)]/30 hover:-translate-y-0.5 transition-all "
                >
                  Create Free Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-bold text-white font-[family-name:var(--font-headline)]">HeatPlan</span>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">Urban Heat Island Mitigation Platform</p>
        </div>
      </footer>
    </main>
  );
}
