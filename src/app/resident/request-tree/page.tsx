'use client';

import Link from 'next/link';
import { useState } from 'react';

const treeSpecies = [
  { name: 'Red Maple', scientific: 'Acer rubrum', cooling: 'High', growth: 'Medium', canopy: '40 ft', shade: 85, co2: '48 lbs/yr', icon: '🍁', color: 'var(--critical)', desc: 'Brilliant fall color, broad canopy. Thrives in varied soil conditions.' },
  { name: 'Live Oak', scientific: 'Quercus virginiana', cooling: 'Very High', growth: 'Slow', canopy: '60 ft', shade: 95, co2: '65 lbs/yr', icon: '🌳', color: 'var(--green-400)', desc: 'Iconic spreading canopy. Excellent long-term shade, extremely resilient.' },
  { name: 'Bald Cypress', scientific: 'Taxodium distichum', cooling: 'High', growth: 'Medium', canopy: '35 ft', shade: 70, co2: '42 lbs/yr', icon: '🌲', color: 'var(--info)', desc: 'Tolerates wet and dry conditions. Feathery foliage, low maintenance.' },
  { name: 'Crape Myrtle', scientific: 'Lagerstroemia indica', cooling: 'Medium', growth: 'Fast', canopy: '25 ft', shade: 55, co2: '28 lbs/yr', icon: '🌸', color: 'var(--high)', desc: 'Quick growth, beautiful blooms. Ideal for smaller spaces and streets.' },
  { name: 'Southern Magnolia', scientific: 'Magnolia grandiflora', cooling: 'High', growth: 'Slow', canopy: '50 ft', shade: 90, co2: '55 lbs/yr', icon: '🌺', color: '#c084fc', desc: 'Evergreen with fragrant flowers. Year-round shade and beauty.' },
  { name: 'Cedar Elm', scientific: 'Ulmus crassifolia', cooling: 'High', growth: 'Medium', canopy: '45 ft', shade: 82, co2: '50 lbs/yr', icon: '🌿', color: 'var(--green-500)', desc: 'Native Texas tree. Drought resistant with dense canopy coverage.' },
];

const propertyTypes = [
  { value: 'residential', label: 'Residential', icon: 'home' },
  { value: 'commercial', label: 'Commercial', icon: 'business' },
  { value: 'public', label: 'Public Space', icon: 'park' },
  { value: 'school', label: 'School / Institution', icon: 'school' },
];

const placementOptions = [
  { value: 'front_yard', label: 'Front Yard', icon: 'yard' },
  { value: 'back_yard', label: 'Back Yard', icon: 'deck' },
  { value: 'sidewalk', label: 'Sidewalk / Street', icon: 'streetview' },
  { value: 'parking', label: 'Parking Area', icon: 'local_parking' },
];

const steps = [
  { num: 1, label: 'Choose Species', icon: 'eco' },
  { num: 2, label: 'Your Details', icon: 'person' },
  { num: 3, label: 'Location', icon: 'location_on' },
  { num: 4, label: 'Review', icon: 'check_circle' },
];

export default function RequestTreePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    propertyType: '',
    placementPref: '',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const selectedTree = treeSpecies.find(t => t.name === selectedSpecies);

  const canProceed = () => {
    if (currentStep === 1) return !!selectedSpecies;
    if (currentStep === 2) return formData.fullName && formData.email;
    if (currentStep === 3) return formData.address && formData.propertyType && formData.placementPref;
    return true;
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] grid-pattern relative flex items-center justify-center p-4">
        <div className="orb orb-primary w-[500px] h-[500px] top-[20%] left-[30%] absolute" />
        <div className="relative z-10 text-center max-w-lg animate-reveal-up">
          <div className="glass-card rounded-3xl p-12 glow-primary relative overflow-hidden">
            <div className="shimmer-bg absolute inset-0 rounded-3xl" />
            <div className="relative z-10">
              <div className="h-20 w-20 rounded-full bg-[var(--green-400)]/15 flex items-center justify-center mx-auto mb-6 pulse-ring">
                <span className="material-symbols-outlined text-4xl text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h1 className="text-3xl font-black text-white font-[family-name:var(--font-headline)]">Request Submitted!</h1>
              <p className="text-[var(--text-secondary)] mt-3 leading-relaxed">
                Your {selectedSpecies} tree request has been received. Our team will review your address and schedule a site survey within 5-7 business days.
              </p>
              <div className="mt-6 glass-card rounded-xl p-4 text-left">
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--green-400)] mb-3">Request Summary</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Species</span><span className="text-white font-semibold">{selectedSpecies}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Address</span><span className="text-white font-semibold">{formData.address}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Placement</span><span className="text-white font-semibold capitalize">{formData.placementPref.replace('_', ' ')}</span></div>
                </div>
              </div>
              <div className="mt-8 flex gap-3 justify-center">
                <Link href="/resident/my-requests" className="px-6 py-3 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">
                  Track My Requests
                </Link>
                <Link href="/resident" className="px-6 py-3 glass-card rounded-xl font-semibold text-white hover:border-white/15 transition-all">
                  Back to Portal
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] grid-pattern relative overflow-hidden">
      {/* Decorative */}
      <div className="orb orb-primary w-[500px] h-[500px] -top-[100px] -right-[100px] fixed" />
      <div className="orb orb-secondary w-[400px] h-[400px] bottom-0 -left-[100px] fixed" />

      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 glass-overlay border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/resident" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
              <span className="font-bold text-white font-[family-name:var(--font-headline)] text-lg">HeatPlan</span>
            </Link>
            <span className="hidden sm:block h-5 w-px bg-white/10" />
            <span className="hidden sm:block text-xs text-[var(--text-secondary)]">Resident Portal</span>
          </div>
          <Link href="/resident" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-8 relative z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          {/* Page Header */}
          <div className="text-center mb-10 animate-reveal-up">
            <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 mb-4">
              <span className="material-symbols-outlined text-[var(--green-400)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>park</span>
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--green-400)]">Tree Request Program</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white font-[family-name:var(--font-headline)] tracking-tight">
              Plant a Tree in<br /><span className="text-gradient-primary">Your Place</span>
            </h1>
            <p className="text-[var(--text-secondary)] mt-3 max-w-xl mx-auto">
              Choose a species, tell us where, and we&apos;ll handle the rest. Free for all residents.
            </p>
          </div>

          {/* Step Progress */}
          <div className="mb-10 animate-reveal-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-center gap-2 md:gap-0 max-w-2xl mx-auto">
              {steps.map((step, idx) => (
                <div key={step.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      currentStep === step.num ? 'bg-[var(--green-400)] text-[var(--bg-base)] glow-primary scale-110' :
                      currentStep > step.num ? 'bg-[var(--green-400)]/20 text-[var(--green-400)]' :
                      'bg-[var(--bg-elevated)] text-[var(--border-strong)]'
                    }`}>
                      {currentStep > step.num ? (
                        <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                      ) : (
                        <span className="material-symbols-outlined text-lg" style={currentStep === step.num ? { fontVariationSettings: "'FILL' 1" } : {}}>{step.icon}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider hidden md:block ${
                      currentStep >= step.num ? 'text-[var(--green-400)]' : 'text-[var(--border-strong)]'
                    }`}>{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-8 md:w-16 h-0.5 mx-1 md:mx-3 rounded-full transition-all duration-300 ${
                      currentStep > step.num ? 'bg-[var(--green-400)]/40' : 'bg-[var(--bg-elevated)]'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="animate-reveal-up" style={{ animationDelay: '0.15s' }}>
            {/* Step 1: Choose Species */}
            {currentStep === 1 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                  {treeSpecies.map((species) => (
                    <button
                      key={species.name}
                      onClick={() => setSelectedSpecies(species.name)}
                      className={`text-left rounded-2xl p-5 transition-all duration-300 relative overflow-hidden group ${
                        selectedSpecies === species.name
                          ? 'glass-card border-[var(--green-400)]/30 glow-primary scale-[1.02]'
                          : 'glass-card-hover'
                      }`}
                    >
                      {selectedSpecies === species.name && <div className="shimmer-bg absolute inset-0 rounded-2xl" />}
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-4xl">{species.icon}</span>
                          {selectedSpecies === species.name && (
                            <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                        </div>
                        <div className="font-bold text-white text-lg">{species.name}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)] italic mt-0.5">{species.scientific}</div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{species.desc}</p>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <div className="bg-[var(--bg-base)]/40 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase">Cooling</div>
                            <div className="text-xs font-bold mt-0.5" style={{ color: species.color }}>{species.cooling}</div>
                          </div>
                          <div className="bg-[var(--bg-base)]/40 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase">Canopy</div>
                            <div className="text-xs font-bold text-white mt-0.5">{species.canopy}</div>
                          </div>
                          <div className="bg-[var(--bg-base)]/40 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-[var(--text-tertiary)] uppercase">CO2</div>
                            <div className="text-xs font-bold text-white mt-0.5">{species.co2}</div>
                          </div>
                        </div>

                        {/* Shade meter */}
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-[var(--text-tertiary)] uppercase">Shade Coverage</span>
                            <span className="text-[10px] font-bold" style={{ color: species.color }}>{species.shade}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${species.shade}%`, backgroundColor: species.color }} />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Your Details */}
            {currentStep === 2 && (
              <div className="max-w-2xl mx-auto">
                <div className="glass-card rounded-2xl p-6 md:p-8">
                  <h3 className="font-bold text-white text-xl mb-6 font-[family-name:var(--font-headline)]">Tell us about yourself</h3>
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all"
                          placeholder="Your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Phone (optional)</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Additional Notes</label>
                      <textarea
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all resize-none"
                        placeholder="Any specific needs, accessibility considerations, etc..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="max-w-3xl mx-auto">
                <div className="glass-card rounded-2xl p-6 md:p-8">
                  <h3 className="font-bold text-white text-xl mb-6 font-[family-name:var(--font-headline)]">Where should we plant?</h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Street Address *</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">location_on</span>
                        <input
                          type="text"
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full pl-12 pr-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all"
                          placeholder="123 Main St, Austin, TX 78701"
                        />
                      </div>
                    </div>

                    {/* Map Placeholder */}
                    <div className="rounded-xl overflow-hidden border border-white/5">
                      <div className="h-[200px] bg-gradient-to-br from-[#0f1930] to-[var(--bg-base)] relative flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-4xl text-[var(--info)]/30" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                          <p className="text-xs text-[var(--border-strong)] mt-2">Map preview will show after address entry</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Property Type *</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {propertyTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setFormData({ ...formData, propertyType: type.value })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                              formData.propertyType === type.value
                                ? 'bg-[var(--green-400)]/10 border border-[var(--green-400)]/30 text-[var(--green-400)]'
                                : 'bg-[var(--bg-base)]/40 border border-white/5 text-[var(--text-tertiary)] hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span className="material-symbols-outlined text-2xl" style={formData.propertyType === type.value ? { fontVariationSettings: "'FILL' 1" } : {}}>{type.icon}</span>
                            <span className="text-xs font-bold">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">Placement Preference *</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {placementOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFormData({ ...formData, placementPref: opt.value })}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${
                              formData.placementPref === opt.value
                                ? 'bg-[var(--info)]/10 border border-[var(--info)]/30 text-[var(--info)]'
                                : 'bg-[var(--bg-base)]/40 border border-white/5 text-[var(--text-tertiary)] hover:text-white hover:border-white/10'
                            }`}
                          >
                            <span className="material-symbols-outlined text-2xl" style={formData.placementPref === opt.value ? { fontVariationSettings: "'FILL' 1" } : {}}>{opt.icon}</span>
                            <span className="text-xs font-bold">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="max-w-2xl mx-auto">
                <div className="glass-card rounded-2xl p-6 md:p-8 glow-primary relative overflow-hidden">
                  <div className="shimmer-bg absolute inset-0 rounded-2xl" />
                  <div className="relative z-10">
                    <h3 className="font-bold text-white text-xl mb-6 font-[family-name:var(--font-headline)]">Review Your Request</h3>

                    {/* Selected Tree */}
                    {selectedTree && (
                      <div className="glass-card rounded-xl p-5 mb-6 flex items-center gap-5">
                        <span className="text-5xl">{selectedTree.icon}</span>
                        <div>
                          <div className="text-lg font-bold text-white">{selectedTree.name}</div>
                          <div className="text-xs text-[var(--text-tertiary)] italic">{selectedTree.scientific}</div>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-[var(--green-400)]">Cooling: {selectedTree.cooling}</span>
                            <span className="text-xs text-[var(--text-secondary)]">Canopy: {selectedTree.canopy}</span>
                            <span className="text-xs text-[var(--text-secondary)]">CO2: {selectedTree.co2}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Name</div>
                          <div className="text-sm font-semibold text-white">{formData.fullName}</div>
                        </div>
                        <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Email</div>
                          <div className="text-sm font-semibold text-white">{formData.email}</div>
                        </div>
                      </div>
                      <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                        <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Address</div>
                        <div className="text-sm font-semibold text-white">{formData.address}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Property</div>
                          <div className="text-sm font-semibold text-white capitalize">{formData.propertyType}</div>
                        </div>
                        <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Placement</div>
                          <div className="text-sm font-semibold text-white capitalize">{formData.placementPref.replace('_', ' ')}</div>
                        </div>
                      </div>
                      {formData.notes && (
                        <div className="bg-[var(--bg-base)]/40 rounded-xl p-4">
                          <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Notes</div>
                          <div className="text-sm text-[var(--text-secondary)]">{formData.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 p-4 rounded-xl border border-[var(--green-400)]/10 bg-[var(--green-400)]/5">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[var(--green-400)] text-lg mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          By submitting, you agree to allow a site survey before planting. A city arborist will assess viability within 5-7 business days. Tree planting is free for residents.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between max-w-2xl mx-auto mt-8 animate-reveal-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              className={`flex items-center gap-2 px-6 py-3 glass-card rounded-xl font-semibold text-white hover:border-white/15 transition-all ${
                currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => canProceed() && setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl shadow-lg shadow-[var(--green-400)]/20 hover:shadow-xl hover:shadow-[var(--green-400)]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed "
              >
                Continue
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl shadow-lg shadow-[var(--green-400)]/20 hover:shadow-xl hover:shadow-[var(--green-400)]/30 transition-all "
              >
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                Submit Request
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
