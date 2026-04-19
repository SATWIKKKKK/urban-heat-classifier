'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { getInterventionStatusColor, type SupportedMapGeometry } from '@/lib/map-utils';
import type { CityMapPayload, CityMapPlace, CityMapIntervention } from '@/lib/map-data';
import GlobalNavbar from '@/components/layout/GlobalNavbar';

function geometryToLeafletLatLngs(geometry: SupportedMapGeometry) {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]));
  }
  return geometry.coordinates.map((polygon) =>
    polygon.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number]))
  );
}

const VULN_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MODERATE: '#eab308',
  LOW: '#22c55e',
};

function SkeletonLine({ w = 'w-24' }: { w?: string }) {
  return <div className={`animate-pulse bg-[var(--bg-elevated)] h-4 ${w} rounded`} />;
}

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    label: 'Dark',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &copy; USGS &copy; NOAA',
    label: 'Satellite',
  },
  street: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    label: 'Street',
  },
} as const;

export default function MapPage() {
  const { data: session, status } = useSession();
  const role = session?.user?.role;
  const canEdit = ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(role || '');
  const isAuthenticated = !!session?.user;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const placesLayerRef = useRef<L.LayerGroup | null>(null);
  const interventionsLayerRef = useRef<L.LayerGroup | null>(null);
  // Ref keeps event-handler closures from going stale
  const selectedPlaceRef = useRef<CityMapPlace | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [payload, setPayload] = useState<CityMapPayload | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CityMapPlace | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<CityMapIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [tileStyle, setTileStyle] = useState<'dark' | 'satellite' | 'street'>('dark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Keep ref in sync so Leaflet event handlers always see the current selection
  useEffect(() => { selectedPlaceRef.current = selectedPlace; }, [selectedPlace]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !payload) return [];
    const q = searchQuery.toLowerCase();
    return payload.places.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 6);
  }, [searchQuery, payload]);

  const cityQuery = useMemo(() => {
    if (status === 'loading') return null;
    if (session?.user?.cityId) {
      return `/api/map-data?cityId=${encodeURIComponent(session.user.cityId)}&includeProposed=${canEdit}`;
    }
    // unauthenticated public view — no city to show
    return null;
  }, [canEdit, session?.user?.cityId, status]);

  useEffect(() => {
    if (!cityQuery) {
      // session loaded but no city assigned — stop showing spinner
      if (status !== 'loading') setLoading(false);
      return;
    }
    const requestUrl = cityQuery;

    async function loadPayload() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(requestUrl);
        const json = (await response.json()) as CityMapPayload | { error?: string };
        if (!response.ok || 'error' in json || !('places' in json)) {
          throw new Error(('error' in json && json.error) || 'Failed to load map data');
        }
        setPayload(json);
        setSelectedPlace(json.places[0] ?? null);
        setSelectedIntervention(null);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to load map data';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadPayload();
  }, [cityQuery, status]);

  // Initialize Leaflet map ONCE on mount — must NOT depend on payload
  // (payload effect runs concurrently; we need mapReady state to sequence them correctly)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    void import('leaflet').then((leaflet) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const map = leaflet.map(mapRef.current, {
        center: [22.5, 82.0], // approximate India center away from any major city
        zoom: 4,
        zoomControl: false,   // we render custom controls
        scrollWheelZoom: true,
      });

      leaflet
        .tileLayer(TILE_LAYERS.dark.url, {
          attribution: TILE_LAYERS.dark.attribution,
          maxZoom: 19,
        })
        .addTo(map);

      tileLayerRef.current = map.eachLayer((l) => l) as unknown as L.TileLayer;

      mapInstanceRef.current = map;
      setMapReady(true); // triggers polygon rendering when payload is also ready
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // CRITICAL: empty — runs exactly once on mount

  // Swap tile layer when tileStyle changes
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      const map = mapInstanceRef.current!;
      // Remove all tile layers
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) map.removeLayer(layer);
      });
      const cfg = TILE_LAYERS[tileStyle];
      L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 }).addTo(map);
    });
  }, [tileStyle, mapReady]);

  // Fly to city when we have both map + coordinates
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !payload?.city.lat) return;
    mapInstanceRef.current.setView([payload.city.lat, payload.city.lng], 13);
  }, [mapReady, payload?.city.lat, payload?.city.lng]);

  // Render places and interventions
  // Depends on BOTH mapReady AND payload — this sequencing is what was broken before
  useEffect(() => {
    if (!mapReady || !payload || !mapInstanceRef.current) return;

    void import('leaflet').then((leaflet) => {
      const map = mapInstanceRef.current!;
      placesLayerRef.current?.removeFrom(map);
      interventionsLayerRef.current?.removeFrom(map);

      const placesLayer = leaflet.layerGroup();
      const interventionsLayer = leaflet.layerGroup();

      payload.places.forEach((place) => {
        const color = VULN_COLORS[place.vulnerabilityLevel] || '#22c55e';
        const polygon = leaflet.polygon(geometryToLeafletLatLngs(place.geometry) as never, {
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.35,
          weight: 0,
        });

        polygon.bindTooltip(`${place.name} · ${place.vulnerabilityLevel}`, {
          className: 'map-tooltip',
        });

        polygon.on('mouseover', () => {
          polygon.setStyle({ fillOpacity: 0.55, color: 'rgba(255,255,255,0.15)', weight: 1 });
        });
        polygon.on('mouseout', () => {
          // Use ref to read current selection without stale closure
          if (selectedPlaceRef.current?.id !== place.id) {
            polygon.setStyle({ fillOpacity: 0.35, color: 'transparent', weight: 0 });
          }
        });
        polygon.on('click', () => {
          setInspectorLoading(true);
          setSelectedPlace(place);
          setSelectedIntervention(null);
          setTimeout(() => setInspectorLoading(false), 50);
        });
        polygon.addTo(placesLayer);
      });

      payload.interventions.forEach((intervention) => {
        const marker = leaflet.circleMarker(intervention.point, {
          radius: 5,
          color: getInterventionStatusColor(intervention.status),
          fillColor: getInterventionStatusColor(intervention.status),
          fillOpacity: 0.85,
          weight: 1,
        });
        marker.bindTooltip(intervention.name, { className: 'map-tooltip' });
        marker.on('click', () => {
          setSelectedIntervention(intervention);
          setSelectedPlace(
            payload.places.find((n) => n.id === intervention.placeId) || null
          );
        });
        marker.addTo(interventionsLayer);
      });

      placesLayer.addTo(map);
      interventionsLayer.addTo(map);
      placesLayerRef.current = placesLayer;
      interventionsLayerRef.current = interventionsLayer;

      if (payload.places.length > 0) {
        const bounds = leaflet.featureGroup([...payload.places.map((n) =>
          leaflet.polygon(geometryToLeafletLatLngs(n.geometry) as never)
        )]);
        map.fitBounds(bounds.getBounds(), { padding: [30, 30] });
      }
    });
  }, [mapReady, payload]);

  // Fly to a place and select it (used by search + sidebar list)
  const flyToPlace = useCallback((place: CityMapPlace) => {
    if (!mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      const poly = L.polygon(geometryToLeafletLatLngs(place.geometry) as never);
      mapInstanceRef.current?.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 15 });
    });
    setSelectedPlace(place);
    setSelectedIntervention(null);
    setSearchQuery('');
    setShowSearch(false);
  }, []);

  const zoomIn = useCallback(() => mapInstanceRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapInstanceRef.current?.zoomOut(), []);

  const inspectorPlace = selectedPlace || payload?.places[0] || null;
  const hasHeatData = inspectorPlace && inspectorPlace.avgTemp != null;

  return (
    <div className="bg-[var(--bg-base)] flex flex-col" style={{ height: '100dvh' }}>
      {/* Global Navbar */}
      <GlobalNavbar activeHref="/map" />

      {/* Floating search bar over the map */}
      <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4 pointer-events-none">
        <div className="relative pointer-events-auto">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] pointer-events-none">search</span>
          <input
            type="text"
            placeholder="Search places\u2026"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 150)}
            className="w-full h-9 pl-8 pr-3 text-xs glass-overlay border border-white/10 rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-white/20 transition-colors shadow-xl"
          />
          {showSearch && searchResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 glass-overlay border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {searchResults.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onMouseDown={() => flyToPlace(n)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition-colors text-left"
                >
                  <span className="font-medium text-[var(--text-primary)]">{n.name}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: VULN_COLORS[n.vulnerabilityLevel] || '#22c55e',
                      backgroundColor: `${VULN_COLORS[n.vulnerabilityLevel] || '#22c55e'}1a`,
                    }}
                  >
                    {n.vulnerabilityLevel}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <main className="relative z-10 mx-auto grid max-w-[1800px] w-full gap-px px-0 lg:grid-cols-[220px_minmax(0,1fr)_280px] flex-1 min-h-0 pt-[64px]">
        {/* Left sidebar — Stats */}
        <section className="bg-[var(--bg-surface)] border-r border-[var(--border)] p-4 overflow-y-auto hidden lg:flex lg:flex-col gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="material-symbols-outlined text-[var(--green-400)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
              <h2 className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Quick Stats</h2>
            </div>

            <div className="border border-[var(--border)] rounded-md divide-y divide-[var(--border)]">
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--critical)]">Critical</span>
                <span className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{payload?.stats.criticalCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--high)]">High Risk</span>
                <span className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{payload?.stats.highCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--info)]">Interventions</span>
                <span className="text-xl font-bold tabular-nums text-[var(--text-primary)]">{payload?.stats.interventionCount ?? 0}</span>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="space-y-2">
              <Link href="/dashboard/interventions" className="flex items-center justify-center gap-1.5 h-[30px] w-full text-xs font-medium bg-[var(--green-500)] text-white rounded-md hover:bg-[var(--green-400)] transition-colors">
                <span className="material-symbols-outlined text-xs">add</span> Add Intervention
              </Link>
              <Link href="/dashboard/scenarios/new" className="flex items-center justify-center h-[30px] w-full text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-overlay)] transition-colors">
                Build Scenario
              </Link>
            </div>
          )}

          {/* Legend */}
          <div className="border-t border-[var(--border)] pt-3">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">Vulnerability</h3>
            <div className="space-y-1.5">
              {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((level) => (
                <div key={level} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: VULN_COLORS[level] }}></div>
                  <span className="text-[11px] text-[var(--text-secondary)] capitalize">{level.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Clickable place list */}
          {payload && payload.places.length > 0 && (
            <div className="border-t border-[var(--border)] pt-3 flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2 shrink-0">
                Areas ({payload.places.length})
              </h3>
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {payload.places.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => flyToPlace(n)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors text-left ${selectedPlace?.id === n.id ? 'bg-[var(--bg-elevated)]' : ''}`}
                  >
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">{n.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-1" style={{ backgroundColor: VULN_COLORS[n.vulnerabilityLevel] || '#22c55e' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Map */}
        <section className="relative min-h-0">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg-base)]/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[var(--green-400)]/30 border-t-[var(--green-400)] rounded-full animate-spin" />
                <span className="text-xs font-medium text-[var(--text-secondary)]">Loading map data…</span>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg-base)]/90 px-6">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-5 text-center max-w-sm">
                <span className="material-symbols-outlined text-xl text-[var(--critical)]">error</span>
                <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>
              </div>
            </div>
          )}
          {!loading && !error && !payload && status !== 'loading' && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg-base)]/90 px-6">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-6 text-center max-w-sm">
                <span className="material-symbols-outlined text-2xl text-[var(--text-tertiary)] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
                <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">No city data yet</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">Complete onboarding and add places to see your city on the map.</p>
                {isAuthenticated && (
                  <Link href="/dashboard/onboarding" className="mt-4 inline-flex items-center gap-1 h-8 px-4 text-xs font-medium bg-[var(--green-500)] text-white rounded-md hover:bg-[var(--green-400)] transition-colors">
                    Go to Onboarding
                  </Link>
                )}
              </div>
            </div>
          )}
          <div ref={mapRef} className="h-full w-full" />

          {/* Custom zoom controls — z-[400] puts them above Leaflet tiles (z-[250]) */}
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1">
            <button type="button" onClick={zoomIn} aria-label="Zoom in" className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors shadow-lg">
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
            <button type="button" onClick={zoomOut} aria-label="Zoom out" className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors shadow-lg">
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
          </div>

          {/* Tile layer toggle — bottom-left, above legend */}
          <div className="absolute bottom-16 right-4 z-[400] flex flex-col gap-px bg-[var(--bg-surface)] border border-[var(--border)] rounded-md overflow-hidden shadow-lg">
            {(['dark', 'satellite', 'street'] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setTileStyle(style)}
                className={`px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.04em] transition-colors ${
                  tileStyle === style
                    ? 'bg-[var(--green-500)] text-white'
                    : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {TILE_LAYERS[style].label}
              </button>
            ))}
          </div>

          {/* Mobile vulnerability legend */}
          <div className="absolute bottom-4 left-4 z-[400] lg:hidden bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border)] rounded-md p-2">
            <div className="flex flex-col gap-1">
              {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((level) => (
                <div key={level} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: VULN_COLORS[level] }} />
                  <span className="text-[10px] text-[var(--text-secondary)] capitalize">{level.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right sidebar — Inspector */}
        <section className="bg-[var(--bg-surface)] border-l border-[var(--border)] p-4 overflow-y-auto">
          {selectedIntervention ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selectedIntervention.name}</h2>
                <button type="button" onClick={() => setSelectedIntervention(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <div className="mt-3 border border-[var(--border)] rounded-md divide-y divide-[var(--border)] text-xs">
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-[var(--text-tertiary)]">Status</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedIntervention.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-[var(--text-tertiary)]">Place</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedIntervention.placeName || 'City-wide'}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-[var(--text-tertiary)]">Cooling</span>
                  <span className="font-semibold text-[var(--green-400)]">{selectedIntervention.estimatedTempReductionC != null ? `-${selectedIntervention.estimatedTempReductionC.toFixed(1)}°C` : '—'}</span>
                </div>
                <div className="flex justify-between items-center px-3 py-2">
                  <span className="text-[var(--text-tertiary)]">Budget</span>
                  <span className="font-medium text-[var(--text-primary)]">{selectedIntervention.estimatedCostUsd != null ? `$${Math.round(selectedIntervention.estimatedCostUsd).toLocaleString()}` : 'Pending'}</span>
                </div>
              </div>
            </>
          ) : inspectorPlace ? (
            <>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{inspectorPlace.name}</h2>
                <div className="mt-1.5">
                  <span
                    className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.05em] rounded px-2 py-0.5"
                    style={{
                      backgroundColor: `${VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e'}1a`,
                      borderColor: `${VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e'}4d`,
                      borderWidth: '1px',
                      color: VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e',
                    }}
                  >
                  {inspectorPlace.vulnerabilityLevel} &middot; Score {inspectorPlace.vulnerabilityScore}
                  </span>
                </div>
              </div>

              {inspectorLoading ? (
                <div className="mt-4 space-y-3">
                  <SkeletonLine w="w-full" />
                  <SkeletonLine w="w-3/4" />
                  <SkeletonLine w="w-full" />
                  <SkeletonLine w="w-2/3" />
                </div>
              ) : hasHeatData ? (
                <>
                  <div className="mt-3 border border-[var(--border)] rounded-md divide-y divide-[var(--border)] text-xs">
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-[var(--text-tertiary)]">Population</span>
                      <span className="font-medium text-[var(--text-primary)]">{inspectorPlace.population?.toLocaleString() || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-[var(--text-tertiary)]">Avg temp</span>
                      <span className="font-medium text-[var(--text-primary)]">{inspectorPlace.avgTemp!.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-[var(--text-tertiary)]">Max temp</span>
                      <span className="font-semibold text-[var(--high)]">{inspectorPlace.maxTemp != null ? `${inspectorPlace.maxTemp.toFixed(1)}°C` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-[var(--text-tertiary)]">Tree canopy</span>
                      <span className="font-medium text-[var(--green-400)]">{inspectorPlace.treeCanopyPct != null ? `${inspectorPlace.treeCanopyPct.toFixed(0)}%` : '—'}</span>
                    </div>
                    {inspectorPlace.imperviousSurfacePct != null && (
                      <div className="flex justify-between items-center px-3 py-2">
                        <span className="text-[var(--text-tertiary)]">Impervious surface</span>
                        <span className="font-medium text-[var(--text-primary)]">{inspectorPlace.imperviousSurfacePct.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  {/* Heat intensity bar */}
                  <div className="mt-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md">
                    <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1.5">
                      <span>Heat Intensity</span>
                      <span>{inspectorPlace.avgTemp!.toFixed(1)}°C avg</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(8, ((inspectorPlace.avgTemp! - 20) / 25) * 100))}%`,
                          backgroundColor: VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e',
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* A2: Empty state when no heat data */
                <div className="mt-4 border border-[var(--border)] rounded-lg p-4">
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    No heat data for {inspectorPlace.name} yet.
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                    Add measurements to see temperature trends, vulnerability score, and intervention impact.
                  </p>
                  <Link
                    href="/dashboard/data"
                    className="mt-3 inline-flex items-center gap-1 h-[28px] px-3 text-[11px] font-medium bg-[var(--green-500)] text-white rounded-md hover:bg-[var(--green-400)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                    Add Heat Data
                  </Link>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] pb-2 border-b border-[var(--border)]">
                  Interventions in this area
                </h3>
                {inspectorPlace.interventions.length === 0 ? (
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">No interventions yet.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {inspectorPlace.interventions.map((intervention) => (
                      <button
                        key={intervention.id}
                        type="button"
                        onClick={() => {
                          const full = payload?.interventions.find((i) => i.id === intervention.id) || null;
                          setSelectedIntervention(full);
                        }}
                        className="w-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-left rounded-md hover:bg-[var(--bg-overlay)] transition-colors"
                      >
                        <div className="font-medium text-[var(--text-primary)] text-xs">{intervention.name}</div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                          {intervention.status.replace(/_/g, ' ')} ·{' '}
                          {intervention.estimatedTempReductionC != null
                            ? `-${intervention.estimatedTempReductionC.toFixed(1)}°C`
                            : 'Pending'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <span className="material-symbols-outlined text-2xl text-[var(--text-tertiary)] mb-2">touch_app</span>
              <p className="text-xs text-[var(--text-tertiary)]">Select a place on the map.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
