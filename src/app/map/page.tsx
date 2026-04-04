'use client';

import { useEffect, useRef, useState } from 'react';
import TopNav from '@/components/layout/TopNav';
import SideNav from '@/components/layout/SideNav';
import GSAPWrapper from '@/components/shared/GSAPWrapper';
import Link from 'next/link';
import { cityZones, interventions } from '@/lib/data/seed';
import 'leaflet/dist/leaflet.css';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [selectedZone, setSelectedZone] = useState(cityZones[3]);
  const [showInspector, setShowInspector] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = L.map(mapRef.current!, {
        center: [40.7128, -74.006],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Add zone polygons
      cityZones.forEach((zone) => {
        const color = zone.heatIndex > 8 ? '#ff716c' : zone.heatIndex > 7 ? '#ff8439' : zone.heatIndex > 6 ? '#ff955a' : '#69f6b8';
        const polygon = L.polygon(zone.bounds as L.LatLngExpression[], {
          color,
          fillColor: color,
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(map);

        polygon.bindTooltip(zone.name, { className: 'bg-[#192540] text-white border-none' });
        polygon.on('click', () => {
          setSelectedZone(zone);
          setShowInspector(true);
        });
      });

      // Add intervention markers
      interventions.forEach((intervention) => {
        const iconColor = intervention.type === 'tree' ? '#69f6b8' : intervention.type === 'cool_pavement' ? '#699cff' : '#ff8439';
        const marker = L.circleMarker(intervention.coordinates as L.LatLngExpression, {
          radius: 8,
          fillColor: iconColor,
          color: iconColor,
          weight: 2,
          fillOpacity: 0.7,
        }).addTo(map);
        marker.bindTooltip(intervention.name);
      });

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image">
      <TopNav />
      <SideNav activeItem="Tree Canopy" />

      <main className="fixed left-0 md:left-64 top-16 right-0 bottom-0 overflow-hidden bg-black">
        {/* Map */}
        <div ref={mapRef} className="absolute inset-0 z-0" />

        {/* Scenario Builder */}
        <GSAPWrapper animation="slideRight" className="absolute top-6 left-6 z-10 w-[90%] md:w-[420px] flex flex-col gap-4">
          <section className="glass-overlay p-5 rounded-xl border border-[#40485d]/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>architecture</span>
                <h3 className="font-[var(--font-headline)] font-extrabold text-white tracking-tight">Scenario Builder</h3>
              </div>
              <span className="bg-[#69f6b8]/20 text-[#69f6b8] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">Active Draft</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#141f38]/50 p-4 rounded-lg">
                <p className="text-[#a3aac4] text-[10px] font-bold uppercase tracking-tighter mb-1">Temp Change</p>
                <p className="text-2xl font-black text-[#69f6b8]">-1.4°C</p>
                <div className="h-1 w-full bg-[#0f1930] mt-2 rounded-full overflow-hidden">
                  <div className="h-full bg-[#69f6b8] w-[65%]"></div>
                </div>
              </div>
              <div className="bg-[#141f38]/50 p-4 rounded-lg">
                <p className="text-[#a3aac4] text-[10px] font-bold uppercase tracking-tighter mb-1">Lives Saved</p>
                <p className="text-2xl font-black text-[#699cff]">+12</p>
                <p className="text-[10px] text-[#a3aac4] mt-2 italic">Projected Annual</p>
              </div>
              <div className="col-span-2 bg-[#141f38]/50 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-[#a3aac4] text-[10px] font-bold uppercase tracking-tighter mb-1">Estimated Cost</p>
                  <p className="text-2xl font-black text-white">$450,000</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#ff8439] font-bold mb-1 flex items-center justify-end gap-1">
                    <span className="material-symbols-outlined text-xs">trending_up</span>
                    12% ROI
                  </p>
                  <span className="text-[10px] text-[#a3aac4] uppercase tracking-widest">Public Utility</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 py-2 bg-[#69f6b8] text-[#002919] rounded font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform">Save Plan</button>
              <Link href="/scenarios" className="flex-1 py-2 border border-[#40485d] text-white rounded font-bold text-xs uppercase tracking-widest hover:bg-[#192540] transition-colors text-center">Compare</Link>
            </div>
          </section>

          {/* Zone Inspector */}
          {showInspector && selectedZone && (
            <section className="glass-overlay p-5 rounded-xl border border-[#40485d]/20 shadow-2xl">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-[var(--font-headline)] font-bold text-white leading-tight">{selectedZone.name}</h4>
                  <p className="text-xs text-[#a3aac4]">Vulnerability Score: {selectedZone.vulnerabilityScore}</p>
                </div>
                <button onClick={() => setShowInspector(false)} className="material-symbols-outlined text-[#a3aac4] hover:text-white">close</button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end border-b border-[#40485d]/20 pb-2">
                  <span className="text-xs text-[#a3aac4]">Baseline Heat</span>
                  <span className="text-sm font-bold text-[#ff8439]">{selectedZone.avgTemp}°C</span>
                </div>
                <div className="flex justify-between items-end border-b border-[#40485d]/20 pb-2">
                  <span className="text-xs text-[#a3aac4]">Max Temperature</span>
                  <span className="text-sm font-bold text-[#ff716c]">{selectedZone.maxTemp}°C</span>
                </div>
                <div className="flex justify-between items-end border-b border-[#40485d]/20 pb-2">
                  <span className="text-xs text-[#a3aac4]">Tree Canopy %</span>
                  <span className="text-sm font-bold text-[#69f6b8]">{selectedZone.treeCanopyPct}%</span>
                </div>
                <div className="flex justify-between items-end border-b border-[#40485d]/20 pb-2">
                  <span className="text-xs text-[#a3aac4]">Pop. Vulnerability</span>
                  <span className="text-sm font-bold text-[#699cff]">{selectedZone.vulnerabilityScore > 8 ? 'High Risk' : selectedZone.vulnerabilityScore > 6 ? 'Medium Risk' : 'Low Risk'}</span>
                </div>
              </div>
            </section>
          )}
        </GSAPWrapper>

        {/* Map Controls */}
        <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
          <div className="flex flex-col rounded-lg bg-[#1f2b49]/80 backdrop-blur-md border border-[#40485d]/30 overflow-hidden shadow-xl">
            <button onClick={() => mapInstanceRef.current?.zoomIn()} className="p-3 text-[#dee5ff] hover:bg-[#69f6b8]/20 transition-colors material-symbols-outlined">add</button>
            <div className="h-px bg-[#40485d]/30 w-full"></div>
            <button onClick={() => mapInstanceRef.current?.zoomOut()} className="p-3 text-[#dee5ff] hover:bg-[#69f6b8]/20 transition-colors material-symbols-outlined">remove</button>
          </div>
          <button className="p-3 rounded-lg bg-[#1f2b49]/80 backdrop-blur-md border border-[#40485d]/30 text-[#dee5ff] hover:bg-[#69f6b8]/20 shadow-xl material-symbols-outlined">layers</button>
        </div>

        {/* Intervention Toolbar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 glass-overlay px-4 md:px-6 py-4 rounded-full border border-[#40485d]/40 shadow-2xl flex items-center gap-4 md:gap-8">
          <div className="flex items-center gap-4 md:gap-6">
            {[
              { icon: 'park', label: 'Trees', color: '#69f6b8' },
              { icon: 'deck', label: 'Green Roofs', color: '#699cff' },
              { icon: 'texture', label: 'Cool Pave', color: '#ff8439' },
            ].map((tool) => (
              <div key={tool.label} className="group flex flex-col items-center gap-1 cursor-pointer">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all`}
                  style={{ backgroundColor: `${tool.color}20`, borderColor: `${tool.color}40`, color: tool.color }}>
                  <span className="material-symbols-outlined">{tool.icon}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#a3aac4] hidden md:block">{tool.label}</span>
              </div>
            ))}
          </div>
          <div className="w-px h-10 bg-[#40485d]/40"></div>
          <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-[#a3aac4] hover:text-white">undo</button>
            <button className="material-symbols-outlined text-[#a3aac4] hover:text-white">redo</button>
            <button className="material-symbols-outlined text-[#ff716c] hover:bg-[#ff716c]/20 p-2 rounded-full transition-colors">delete</button>
          </div>
        </div>
      </main>
    </div>
  );
}
