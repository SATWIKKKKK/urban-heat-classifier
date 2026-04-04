'use client';

import TopNav from '@/components/layout/TopNav';
import MobileNav from '@/components/layout/MobileNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import Link from 'next/link';
import { useState } from 'react';

const treeSpecies = [
  { name: 'Red Maple', scientific: 'Acer rubrum', cooling: 'High', growth: 'Medium', canopy: '40 ft', icon: '🍁' },
  { name: 'Live Oak', scientific: 'Quercus virginiana', cooling: 'Very High', growth: 'Slow', canopy: '60 ft', icon: '🌳' },
  { name: 'Bald Cypress', scientific: 'Taxodium distichum', cooling: 'High', growth: 'Medium', canopy: '35 ft', icon: '🌲' },
  { name: 'Crape Myrtle', scientific: 'Lagerstroemia indica', cooling: 'Medium', growth: 'Fast', canopy: '25 ft', icon: '🌸' },
  { name: 'Southern Magnolia', scientific: 'Magnolia grandiflora', cooling: 'High', growth: 'Slow', canopy: '50 ft', icon: '🌺' },
];

const residentSideLinks = [
  { label: 'Portal Home', href: '/resident', icon: 'home' },
  { label: 'Request a Tree', href: '/resident/request-tree', icon: 'park', active: true },
  { label: 'My Requests', href: '/resident/my-requests', icon: 'assignment' },
  { label: 'Report Heat Issue', href: '#', icon: 'report' },
  { label: 'Cooling Centers', href: '#', icon: 'ac_unit' },
  { label: 'Community Events', href: '#', icon: 'event' },
];

export default function RequestTreePage() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    propertyType: 'residential',
    placementPref: 'front_yard',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

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
          <div className="mt-auto pt-6 border-t border-[#40485d]/10">
            <div className="bg-[#141f38] rounded-xl p-4">
              <span className="text-[10px] font-bold text-[#69f6b8] uppercase tracking-widest">Tip</span>
              <p className="text-xs text-[#a3aac4] mt-2">Trees planted in strategic locations can reduce nearby home cooling costs by up to 25%.</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 flex-1 p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <GSAPWrapper animation="slideUp">
              <div className="mb-8">
                <Link href="/resident" className="text-xs text-[#69f6b8] hover:underline flex items-center gap-1 mb-3">
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Portal
                </Link>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter font-[var(--font-headline)]">Request a Tree</h1>
                <p className="text-[#a3aac4] mt-2">Select a species, mark your preferred location, and submit your request.</p>
              </div>
            </GSAPWrapper>

            {/* Success Message */}
            {submitted && (
              <GSAPWrapper animation="slideUp">
                <div className="bg-[#69f6b8]/10 border border-[#69f6b8]/30 rounded-xl p-6 mb-8 flex items-center gap-4">
                  <span className="material-symbols-outlined text-3xl text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <h3 className="font-bold text-[#69f6b8] text-lg">Request Submitted Successfully!</h3>
                    <p className="text-[#a3aac4] text-sm">Your tree planting request has been submitted. You&apos;ll receive a confirmation email shortly. Track status in &quot;My Requests&quot;.</p>
                  </div>
                </div>
              </GSAPWrapper>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Map Area */}
              <GSAPWrapper animation="slideUp" delay={0.1}>
                <div className="lg:col-span-3">
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="h-[350px] md:h-[450px] relative bg-gradient-to-br from-[#141f38] to-[#0a1628]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-6xl text-[#69f6b8]/30" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                          <p className="text-sm text-slate-500 mt-3">Click on the map to mark your preferred tree location</p>
                          <p className="text-xs text-slate-600 mt-1">Or enter your address below</p>
                        </div>
                      </div>
                      {/* Map controls */}
                      <div className="absolute right-4 top-4 flex flex-col gap-2">
                        <button className="h-10 w-10 bg-[#192540]/90 backdrop-blur-md border border-[#40485d]/20 rounded-lg flex items-center justify-center text-white hover:bg-[#192540] transition-all">
                          <span className="material-symbols-outlined text-lg">add</span>
                        </button>
                        <button className="h-10 w-10 bg-[#192540]/90 backdrop-blur-md border border-[#40485d]/20 rounded-lg flex items-center justify-center text-white hover:bg-[#192540] transition-all">
                          <span className="material-symbols-outlined text-lg">remove</span>
                        </button>
                        <button className="h-10 w-10 bg-[#192540]/90 backdrop-blur-md border border-[#40485d]/20 rounded-lg flex items-center justify-center text-white hover:bg-[#192540] transition-all">
                          <span className="material-symbols-outlined text-lg">my_location</span>
                        </button>
                      </div>
                      {/* Address overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-[#192540]/90 backdrop-blur-md border-t border-[#40485d]/20 p-4">
                        <div className="flex gap-2">
                          <span className="material-symbols-outlined text-slate-500 mt-2.5">location_on</span>
                          <input
                            type="text"
                            placeholder="Enter your address to zoom to location..."
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="flex-1 px-4 py-2.5 bg-[#0f1930] border border-[#40485d]/30 rounded-lg text-sm text-[#dee5ff] placeholder:text-slate-500 focus:border-[#69f6b8]/50 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Species Selection */}
                  <div className="mt-6">
                    <h3 className="font-bold text-white text-lg mb-4 font-[var(--font-headline)]">Select Tree Species</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {treeSpecies.map((species) => (
                        <button
                          key={species.name}
                          onClick={() => setSelectedSpecies(species.name)}
                          className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                            selectedSpecies === species.name
                              ? 'bg-[#69f6b8]/10 border-[#69f6b8]/40'
                              : 'bg-[#0f1930] border-[#40485d]/10 hover:border-[#40485d]/30'
                          }`}
                        >
                          <span className="text-2xl">{species.icon}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-white text-sm">{species.name}</div>
                            <div className="text-[10px] text-slate-500 italic">{species.scientific}</div>
                            <div className="flex gap-3 mt-2">
                              <span className="text-[10px] text-[#69f6b8]">Cooling: {species.cooling}</span>
                              <span className="text-[10px] text-slate-500">Growth: {species.growth}</span>
                            </div>
                          </div>
                          {selectedSpecies === species.name && (
                            <span className="material-symbols-outlined text-[#69f6b8] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </GSAPWrapper>

              {/* Form */}
              <GSAPWrapper animation="slideRight" delay={0.2}>
                <div className="lg:col-span-2">
                  <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 sticky top-24">
                    <h3 className="font-bold text-white text-lg mb-6 font-[var(--font-headline)]">Your Information</h3>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                          placeholder="john@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                          placeholder="(555) 123-4567"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Property Type</label>
                        <select
                          value={formData.propertyType}
                          onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                        >
                          <option value="residential">Residential</option>
                          <option value="commercial">Commercial</option>
                          <option value="public">Public Space</option>
                          <option value="school">School / Institution</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Placement Preference</label>
                        <select
                          value={formData.placementPref}
                          onChange={(e) => setFormData({ ...formData, placementPref: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all"
                        >
                          <option value="front_yard">Front Yard</option>
                          <option value="back_yard">Back Yard</option>
                          <option value="sidewalk">Sidewalk / Street</option>
                          <option value="parking">Parking Area</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 block mb-1">Additional Notes</label>
                        <textarea
                          rows={3}
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#141f38] border border-[#40485d]/20 rounded-lg text-sm text-[#dee5ff] focus:border-[#69f6b8]/50 focus:outline-none transition-all resize-none"
                          placeholder="Any special requirements or preferences..."
                        ></textarea>
                      </div>
                      {selectedSpecies && (
                        <div className="bg-[#69f6b8]/5 border border-[#69f6b8]/20 rounded-lg p-3 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#69f6b8] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                          <span className="text-xs text-[#69f6b8]">Selected: <strong>{selectedSpecies}</strong></span>
                        </div>
                      )}
                      <button
                        type="submit"
                        className="w-full py-3.5 bg-gradient-to-br from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-lg shadow-xl hover:shadow-2xl active:scale-95 transition-all mt-2"
                      >
                        Submit Tree Request
                      </button>
                      <p className="text-[10px] text-slate-500 text-center">By submitting, you agree to allow a site survey before planting.</p>
                    </div>
                  </form>
                </div>
              </GSAPWrapper>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
