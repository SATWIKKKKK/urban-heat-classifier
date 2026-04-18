import Link from 'next/link';

const demoCities = [
  { name: 'Austin, TX', status: 'Live heat map', neighborhoods: 10, interventions: 8, accent: '#69f6b8', icon: 'location_city' },
  { name: 'Phoenix, AZ', status: 'Scenario planning', neighborhoods: 8, interventions: 12, accent: '#699cff', icon: 'wb_sunny' },
  { name: 'Houston, TX', status: 'Council review', neighborhoods: 9, interventions: 6, accent: '#ff8439', icon: 'thermostat' },
];

const features = [
  { title: 'Map Vulnerability', desc: 'Identify neighborhoods with highest heat exposure using real temperature data and demographics.', icon: 'map', color: '#ff716c' },
  { title: 'Plan Interventions', desc: 'Place trees, green roofs, cool pavement, and urban parks directly on the map with cost estimates.', icon: 'construction', color: '#69f6b8' },
  { title: 'Simulate Impact', desc: 'Run EPA-based simulations to estimate cooling, lives saved, and CO2 reductions.', icon: 'analytics', color: '#699cff' },
  { title: 'Council Approval', desc: 'Submit scenarios to city council with auto-generated reports and budget breakdowns.', icon: 'how_to_vote', color: '#ff8439' },
];

const stats = [
  { label: 'Cities', value: '3+', icon: 'apartment' },
  { label: 'Neighborhoods Mapped', value: '27', icon: 'grid_view' },
  { label: 'Interventions Planned', value: '156', icon: 'eco' },
  { label: 'Lives Protected/Year', value: '890+', icon: 'favorite' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060e20] text-white overflow-hidden relative">
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
                <span className="material-symbols-outlined text-[#69f6b8] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#69f6b8]">HeatPlan</span>
                <span className="h-1 w-1 rounded-full bg-[#69f6b8]/40" />
                <span className="text-xs text-[#a3aac4]">Urban Climate Action</span>
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-[-0.04em] font-[family-name:var(--font-headline)]">
                <span className="text-white">Fight</span><br />
                <span className="text-gradient-primary">Urban Heat</span><br />
                <span className="text-white/60">Together</span>
              </h1>

              <p className="mt-8 max-w-lg text-lg leading-relaxed text-[#a3aac4]">
                Map vulnerable neighborhoods, plan interventions, simulate impact,
                and get city council approval — all in one platform.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-2xl shadow-lg shadow-[#69f6b8]/20 transition-all hover:shadow-xl hover:shadow-[#69f6b8]/30 hover:-translate-y-0.5 active:scale-[0.98] btn-shine"
                >
                  <span className="flex items-center gap-2">
                    Get Started — Free
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </span>
                </Link>
                <Link
                  href="/map"
                  className="px-8 py-4 glass-card rounded-2xl font-bold text-white hover:border-[#69f6b8]/20 transition-all hover:-translate-y-0.5"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#699cff]">public</span>
                    View Public Map
                  </span>
                </Link>
              </div>

              <p className="mt-6 text-sm text-[#6d758c]">
                Already have an account?{' '}
                <Link href="/login" className="text-[#69f6b8] hover:underline font-semibold underline-offset-4">
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
                    <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>language</span>
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#69f6b8]">Cities using HeatPlan</span>
                  </div>

                  <div className="space-y-3 stagger-children">
                    {demoCities.map((city) => (
                      <div key={city.name} className="flex items-center justify-between rounded-2xl glass-card px-5 py-4 hover:border-white/10 transition-all group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${city.accent}15` }}>
                            <span className="material-symbols-outlined" style={{ color: city.accent, fontVariationSettings: "'FILL' 1" }}>{city.icon}</span>
                          </div>
                          <div>
                            <div className="text-base font-bold text-white group-hover:text-[#69f6b8] transition-colors">{city.name}</div>
                            <div className="text-xs text-[#a3aac4] flex items-center gap-3">
                              <span>{city.neighborhoods} neighborhoods</span>
                              <span className="h-1 w-1 rounded-full bg-[#40485d]" />
                              <span>{city.status}</span>
                            </div>
                          </div>
                        </div>
                        <div className="h-3 w-3 rounded-full pulse-ring" style={{ backgroundColor: city.accent }} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-2xl bg-[#060e20]/50 border border-white/5 p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#699cff] mb-2">How it works</div>
                    <div className="text-sm leading-7 text-[#a3aac4]">
                      Create your city account, complete onboarding, invite your planner and council members,
                      then start mapping heat vulnerability and planning cooling interventions.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 stagger-children">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="material-symbols-outlined text-2xl text-[#69f6b8] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                <div className="text-3xl md:text-4xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
                <div className="text-xs uppercase tracking-widest text-[#6d758c] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#699cff]">Platform Features</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-3 font-[family-name:var(--font-headline)] tracking-tight">
              Everything your city needs
            </h2>
            <p className="text-[#a3aac4] mt-4 max-w-2xl mx-auto">
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
                  <p className="text-sm text-[#a3aac4] leading-relaxed">{feature.desc}</p>
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
              <span className="material-symbols-outlined text-5xl text-[#69f6b8] mb-6" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <h2 className="text-3xl md:text-5xl font-black text-white font-[family-name:var(--font-headline)] tracking-tight">
                Ready to cool your city?
              </h2>
              <p className="text-[#a3aac4] mt-4 text-lg max-w-xl mx-auto">
                Join cities across America using data-driven heat mitigation planning. Get started in under 15 minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/register"
                  className="px-10 py-4 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-2xl shadow-lg shadow-[#69f6b8]/20 hover:shadow-xl hover:shadow-[#69f6b8]/30 hover:-translate-y-0.5 transition-all btn-shine"
                >
                  Create Free Account
                </Link>
                <Link
                  href="/map"
                  className="px-10 py-4 glass-card rounded-2xl font-bold text-white hover:border-[#69f6b8]/20 transition-all"
                >
                  Explore Demo Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <span className="font-bold text-white font-[family-name:var(--font-headline)]">HeatPlan</span>
          </div>
          <p className="text-xs text-[#6d758c]">Urban Heat Island Mitigation Platform</p>
        </div>
      </footer>
    </main>
  );
}
