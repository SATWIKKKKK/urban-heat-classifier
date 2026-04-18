'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { getInterventionStatusColor, type SupportedMapGeometry } from '@/lib/map-utils';
import type { CityMapPayload, CityMapNeighborhood, CityMapIntervention } from '@/lib/map-data';

function geometryToLeafletLatLngs(geometry: SupportedMapGeometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));
  }

  return geometry.coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  );
}

export default function MapPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const canEdit = ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(role || '');
  const isAuthenticated = !!session?.user;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const neighborhoodsLayerRef = useRef<L.LayerGroup | null>(null);
  const interventionsLayerRef = useRef<L.LayerGroup | null>(null);
  const [payload, setPayload] = useState<CityMapPayload | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<CityMapNeighborhood | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<CityMapIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cityQuery = useMemo(() => {
    if (status === 'loading') {
      return null;
    }

    if (session?.user?.cityId) {
      return `/api/map-data?cityId=${encodeURIComponent(session.user.cityId)}&includeProposed=${canEdit}`;
    }

    return '/api/map-data?citySlug=austin-tx&public=true';
  }, [canEdit, session?.user?.cityId, status]);

  useEffect(() => {
    if (!cityQuery) {
      return;
    }

    const requestUrl = cityQuery;

    async function loadPayload() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(requestUrl);
        const json = (await response.json()) as CityMapPayload | { error?: string };

        if (!response.ok || 'error' in json || !('neighborhoods' in json)) {
          throw new Error(('error' in json && json.error) || 'Failed to load map data');
        }

        setPayload(json);
        setSelectedNeighborhood(json.neighborhoods[0] ?? null);
        setSelectedIntervention(null);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to load map data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadPayload();
  }, [cityQuery]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) {
      return;
    }

    void import('leaflet').then((leaflet) => {
      const map = leaflet.map(mapRef.current!, {
        center: [30.2672, -97.7431],
        zoom: 11,
        zoomControl: false,
      });

      leaflet
        .tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '© OpenStreetMap © CARTO',
          maxZoom: 19,
        })
        .addTo(map);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!payload || !mapInstanceRef.current) {
      return;
    }

    void import('leaflet').then((leaflet) => {
      const map = mapInstanceRef.current!;
      neighborhoodsLayerRef.current?.removeFrom(map);
      interventionsLayerRef.current?.removeFrom(map);

      const neighborhoodsLayer = leaflet.layerGroup();
      const interventionsLayer = leaflet.layerGroup();

      payload.neighborhoods.forEach((neighborhood) => {
        const polygon = leaflet.polygon(geometryToLeafletLatLngs(neighborhood.geometry) as never, {
          color:
            neighborhood.vulnerabilityLevel === 'CRITICAL'
              ? '#dc2626'
              : neighborhood.vulnerabilityLevel === 'HIGH'
                ? '#ea580c'
                : neighborhood.vulnerabilityLevel === 'MODERATE'
                  ? '#ca8a04'
                  : '#16a34a',
          fillOpacity: 0.35,
          weight: 2,
        });

        polygon.bindTooltip(`${neighborhood.name} · ${neighborhood.vulnerabilityLevel}`);
        polygon.on('click', () => {
          setSelectedNeighborhood(neighborhood);
          setSelectedIntervention(null);
        });
        polygon.addTo(neighborhoodsLayer);
      });

      payload.interventions.forEach((intervention) => {
        const marker = leaflet.circleMarker(intervention.point, {
          radius: 8,
          color: getInterventionStatusColor(intervention.status),
          fillColor: getInterventionStatusColor(intervention.status),
          fillOpacity: 0.85,
          weight: 2,
        });

        marker.bindTooltip(intervention.name);
        marker.on('click', () => {
          setSelectedIntervention(intervention);
          setSelectedNeighborhood(
            payload.neighborhoods.find((neighborhood) => neighborhood.id === intervention.neighborhoodId) || null
          );
        });
        marker.addTo(interventionsLayer);
      });

      neighborhoodsLayer.addTo(map);
      interventionsLayer.addTo(map);
      neighborhoodsLayerRef.current = neighborhoodsLayer;
      interventionsLayerRef.current = interventionsLayer;

      const bounds = leaflet.featureGroup([...payload.neighborhoods.map((neighborhood) =>
        leaflet.polygon(geometryToLeafletLatLngs(neighborhood.geometry) as never)
      )]);
      map.fitBounds(bounds.getBounds(), { padding: [30, 30] });
    });
  }, [payload]);

  const inspectorNeighborhood =
    selectedNeighborhood || payload?.neighborhoods[0] || null;

  return (
    <div className="min-h-screen bg-[#060e20] relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none"></div>
      <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] orb orb-primary opacity-20 pointer-events-none"></div>
      <div className="fixed bottom-[-20%] left-[-10%] w-[400px] h-[400px] orb orb-secondary opacity-15 pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-20 glass-overlay border-b border-white/5 px-6 py-4">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#69f6b8] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#69f6b8] font-[family-name:var(--font-headline)]">HeatPlan</div>
              <h1 className="text-xl font-extrabold tracking-tight text-white font-[family-name:var(--font-headline)]">
                {payload?.city.name || 'Austin, TX'} Heat Map
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isAuthenticated ? (
              <>
                <span className="rounded-full bg-[#69f6b8]/10 border border-[#69f6b8]/20 px-3 py-1.5 text-xs font-bold text-[#69f6b8]">{role?.replace('_', ' ')}</span>
                <Link href="/dashboard" className="rounded-xl bg-white/5 border border-white/10 px-4 py-2 font-semibold text-white hover:bg-white/10 transition-all">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <span className="rounded-full bg-[#ff716c]/10 border border-[#ff716c]/20 px-3 py-1.5 text-xs font-bold text-[#ff716c]">Public View</span>
                <Link href="/login" className="rounded-xl border border-white/10 px-4 py-2 font-semibold text-white hover:bg-white/10 transition-all">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-[1800px] gap-4 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)_320px] h-[calc(100vh-73px)]">
        {/* Left sidebar - Stats */}
        <section className="glass-card rounded-2xl p-5 overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
            <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Quick Stats</h2>
          </div>
          <div className="grid gap-3">
            <div className="rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#ff716c]">Critical</div>
              <div className="mt-2 text-3xl font-black text-white">{payload?.stats.criticalCount ?? 0}</div>
            </div>
            <div className="rounded-xl bg-[#ff8439]/10 border border-[#ff8439]/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#ff8439]">High Risk</div>
              <div className="mt-2 text-3xl font-black text-white">{payload?.stats.highCount ?? 0}</div>
            </div>
            <div className="rounded-xl bg-[#699cff]/10 border border-[#699cff]/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#699cff]">Interventions</div>
              <div className="mt-2 text-3xl font-black text-white">{payload?.stats.interventionCount ?? 0}</div>
            </div>
          </div>

          {canEdit && (
            <div className="mt-6 space-y-3">
              <Link href="/dashboard/interventions" className="block rounded-xl bg-gradient-to-r from-[#69f6b8] to-[#06b77f] px-4 py-3 text-center text-sm font-bold text-[#002919] btn-shine">
                <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-lg">add</span> Add Intervention</span>
              </Link>
              <Link href="/dashboard/scenarios/new" className="block rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/5 transition-all">
                Build Scenario
              </Link>
            </div>
          )}

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6d758c] mb-3">Vulnerability Legend</h3>
            <div className="space-y-2">
              {[
                { label: 'Critical', color: '#dc2626' },
                { label: 'High', color: '#ea580c' },
                { label: 'Moderate', color: '#ca8a04' },
                { label: 'Low', color: '#16a34a' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs text-[#a3aac4]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="relative min-h-0 overflow-hidden rounded-2xl glass-card">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#060e20]/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#69f6b8]/30 border-t-[#69f6b8] rounded-full animate-spin"></div>
                <span className="text-sm font-semibold text-white">Loading map…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#060e20]/90 px-6">
              <div className="glass-card rounded-2xl p-6 text-center max-w-md">
                <span className="material-symbols-outlined text-3xl text-[#ff716c]">error</span>
                <p className="mt-2 text-sm text-[#ff716c]">{error}</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="h-full w-full" />
        </section>

        {/* Right sidebar - Inspector */}
        <section className="glass-card rounded-2xl p-5 overflow-y-auto">
          {selectedIntervention ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">{selectedIntervention.name}</h2>
                <button
                  type="button"
                  onClick={() => setSelectedIntervention(null)}
                  className="text-xs font-semibold text-[#6d758c] hover:text-white transition-colors rounded-lg p-1"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Status</span>
                  <span className="font-semibold text-white text-xs px-2 py-0.5 rounded-full bg-[#69f6b8]/10 text-[#69f6b8]">{selectedIntervention.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Neighborhood</span>
                  <span className="font-semibold text-white">{selectedIntervention.neighborhoodName || 'City-wide'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Cooling</span>
                  <span className="font-bold text-[#69f6b8]">{selectedIntervention.estimatedTempReductionC != null ? `-${selectedIntervention.estimatedTempReductionC.toFixed(1)}°C` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#6d758c]">Budget</span>
                  <span className="font-semibold text-white">{selectedIntervention.estimatedCostUsd != null ? `$${Math.round(selectedIntervention.estimatedCostUsd).toLocaleString()}` : 'Pending'}</span>
                </div>
              </div>
            </>
          ) : inspectorNeighborhood ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">{inspectorNeighborhood.name}</h2>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wider text-[#ff716c]">
                    {inspectorNeighborhood.vulnerabilityLevel} · Score {inspectorNeighborhood.vulnerabilityScore}
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Population</span>
                  <span className="font-semibold text-white">{inspectorNeighborhood.population?.toLocaleString() || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Avg temp</span>
                  <span className="font-semibold text-white">{inspectorNeighborhood.avgTemp != null ? `${inspectorNeighborhood.avgTemp.toFixed(1)}°C` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-[#6d758c]">Max temp</span>
                  <span className="font-bold text-[#ff8439]">{inspectorNeighborhood.maxTemp != null ? `${inspectorNeighborhood.maxTemp.toFixed(1)}°C` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-[#6d758c]">Tree canopy</span>
                  <span className="font-semibold text-[#69f6b8]">{inspectorNeighborhood.treeCanopyPct != null ? `${inspectorNeighborhood.treeCanopyPct.toFixed(0)}%` : '—'}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6d758c]">Interventions in this area</h3>
                {inspectorNeighborhood.interventions.length === 0 ? (
                  <p className="mt-3 text-sm text-[#6d758c]">No visible interventions yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {inspectorNeighborhood.interventions.map((intervention) => (
                      <button
                        key={intervention.id}
                        type="button"
                        onClick={() => {
                          const fullIntervention = payload?.interventions.find((item) => item.id === intervention.id) || null;
                          setSelectedIntervention(fullIntervention);
                        }}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-all"
                      >
                        <div className="font-semibold text-white text-sm">{intervention.name}</div>
                        <div className="mt-1 text-xs text-[#6d758c]">
                          {intervention.status.replace('_', ' ')} · {intervention.estimatedTempReductionC != null ? `-${intervention.estimatedTempReductionC.toFixed(1)}°C` : 'Cooling pending'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <span className="material-symbols-outlined text-4xl text-[#6d758c] mb-3">touch_app</span>
              <p className="text-sm text-[#6d758c]">Select a neighborhood or intervention on the map.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
