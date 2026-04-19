'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import { getInterventionStatusColor, type SupportedMapGeometry } from '@/lib/map-utils';
import type { CityMapPayload, CityMapPlace, CityMapIntervention } from '@/lib/map-data';

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

const TILE_LAYERS = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap &copy; CARTO', label: 'Dark' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri &copy; USGS &copy; NOAA', label: 'Satellite' },
  street: { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attribution: '&copy; OpenStreetMap &copy; CARTO', label: 'Street' },
} as const;

interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string;
  type: string; class: string; boundingbox: string[];
  geojson?: { type: string; coordinates: unknown };
}

interface LivePlaceData {
  name: string; lat: number; lng: number; displayName: string;
  weather?: { temp: number; humidity: number; description: string; windSpeed: number };
  aqi?: { pm25: number; overall: number };
  forecast?: { dates: string[]; maxTemps: number[]; minTemps: number[] };
}

export default function DashboardMapPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const role = session?.user?.role;
  const canEdit = ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(role || '');

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const placesLayerRef = useRef<L.LayerGroup | null>(null);
  const interventionsLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const selectedPlaceRef = useRef<CityMapPlace | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [payload, setPayload] = useState<CityMapPayload | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CityMapPlace | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<CityMapIntervention | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tileStyle, setTileStyle] = useState<'dark' | 'satellite' | 'street'>('dark');

  // Global search
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<NominatimResult[]>([]);
  const [showGlobalResults, setShowGlobalResults] = useState(false);
  const [searchingGlobal, setSearchingGlobal] = useState(false);

  // Local search (within city places)
  const [localQuery, setLocalQuery] = useState('');

  // Searched external place
  const [searchedPlace, setSearchedPlace] = useState<LivePlaceData | null>(null);
  const [searchedPlaceLoading, setSearchedPlaceLoading] = useState(false);

  // Gemini analysis
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);

  useEffect(() => { selectedPlaceRef.current = selectedPlace; }, [selectedPlace]);

  // Filter places locally
  const localResults = useMemo(() => {
    if (!localQuery.trim() || !payload) return [];
    const q = localQuery.toLowerCase();
    return payload.places.filter((n) => n.name.toLowerCase().includes(q)).slice(0, 6);
  }, [localQuery, payload]);

  // City data query
  const cityQuery = useMemo(() => {
    if (status === 'loading') return null;
    if (session?.user?.cityId) return `/api/map-data?cityId=${encodeURIComponent(session.user.cityId)}&includeProposed=${canEdit}`;
    return null;
  }, [canEdit, session?.user?.cityId, status]);

  // Load city payload
  useEffect(() => {
    if (!cityQuery) { if (status !== 'loading') setLoading(false); return; }
    async function loadPayload() {
      setLoading(true); setError('');
      try {
        const res = await fetch(cityQuery!);
        const json = await res.json();
        if (!res.ok || 'error' in json || !('places' in json)) throw new Error(json.error || 'Failed to load map data');
        setPayload(json);
        // Auto-select from URL
        const placeIdParam = searchParams.get('placeId');
        if (placeIdParam) {
          const found = json.places.find((p: CityMapPlace) => p.id === placeIdParam);
          if (found) setSelectedPlace(found);
        } else {
          setSelectedPlace(json.places[0] ?? null);
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load map data'); }
      finally { setLoading(false); }
    }
    void loadPayload();
  }, [cityQuery, status, searchParams]);

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { center: [22.5, 82.0], zoom: 4, zoomControl: false, scrollWheelZoom: true });
      L.tileLayer(TILE_LAYERS.dark.url, { attribution: TILE_LAYERS.dark.attribution, maxZoom: 19 }).addTo(map);
      mapInstanceRef.current = map;
      setMapReady(true);
    });
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, []);

  // Swap tile layer
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      const map = mapInstanceRef.current!;
      map.eachLayer((layer) => { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
      const cfg = TILE_LAYERS[tileStyle];
      L.tileLayer(cfg.url, { attribution: cfg.attribution, maxZoom: 19 }).addTo(map);
    });
  }, [tileStyle, mapReady]);

  // Fly to city
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !payload?.city.lat) return;
    mapInstanceRef.current.setView([payload.city.lat, payload.city.lng], 13);
  }, [mapReady, payload?.city.lat, payload?.city.lng]);

  // Render places and interventions
  useEffect(() => {
    if (!mapReady || !payload || !mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      const map = mapInstanceRef.current!;
      placesLayerRef.current?.removeFrom(map);
      interventionsLayerRef.current?.removeFrom(map);
      const placesLayer = L.layerGroup();
      const interventionsLayer = L.layerGroup();

      payload.places.forEach((place) => {
        const color = VULN_COLORS[place.vulnerabilityLevel] || '#22c55e';
        const polygon = L.polygon(geometryToLeafletLatLngs(place.geometry) as never, { color: 'transparent', fillColor: color, fillOpacity: 0.35, weight: 0 });
        polygon.bindTooltip(`${place.name} · ${place.vulnerabilityLevel}`, { className: 'map-tooltip' });
        polygon.on('mouseover', () => polygon.setStyle({ fillOpacity: 0.55, color: 'rgba(255,255,255,0.15)', weight: 1 }));
        polygon.on('mouseout', () => { if (selectedPlaceRef.current?.id !== place.id) polygon.setStyle({ fillOpacity: 0.35, color: 'transparent', weight: 0 }); });
        polygon.on('click', () => { setSelectedPlace(place); setSelectedIntervention(null); setSearchedPlace(null); });
        polygon.addTo(placesLayer);
      });

      payload.interventions.forEach((intervention) => {
        const marker = L.circleMarker(intervention.point, { radius: 5, color: getInterventionStatusColor(intervention.status), fillColor: getInterventionStatusColor(intervention.status), fillOpacity: 0.85, weight: 1 });
        marker.bindTooltip(intervention.name, { className: 'map-tooltip' });
        marker.on('click', () => { setSelectedIntervention(intervention); setSelectedPlace(payload.places.find((n) => n.id === intervention.placeId) || null); setSearchedPlace(null); });
        marker.addTo(interventionsLayer);
      });

      placesLayer.addTo(map);
      interventionsLayer.addTo(map);
      placesLayerRef.current = placesLayer;
      interventionsLayerRef.current = interventionsLayer;

      if (payload.places.length > 0) {
        const bounds = L.featureGroup([...payload.places.map((n) => L.polygon(geometryToLeafletLatLngs(n.geometry) as never))]);
        map.fitBounds(bounds.getBounds(), { padding: [30, 30] });
      }
    });
  }, [mapReady, payload]);

  const flyToPlace = useCallback((place: CityMapPlace) => {
    if (!mapInstanceRef.current) return;
    void import('leaflet').then((L) => {
      const poly = L.polygon(geometryToLeafletLatLngs(place.geometry) as never);
      mapInstanceRef.current?.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 15 });
    });
    setSelectedPlace(place);
    setSelectedIntervention(null);
    setSearchedPlace(null);
    setLocalQuery('');
  }, []);

  // Global search via Nominatim
  async function handleGlobalSearch() {
    if (!globalQuery.trim()) return;
    setSearchingGlobal(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&polygon_geojson=1&limit=6&q=${encodeURIComponent(globalQuery)}`);
      const data: NominatimResult[] = await res.json();
      setGlobalResults(data);
      setShowGlobalResults(true);
    } catch { setGlobalResults([]); }
    finally { setSearchingGlobal(false); }
  }

  // Select a global search result: fly to it, fetch live data
  async function selectGlobalResult(result: NominatimResult) {
    setShowGlobalResults(false);
    setGlobalQuery(result.display_name.split(',')[0]);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSearchedPlaceLoading(true);
    setSelectedPlace(null);
    setSelectedIntervention(null);
    setGeminiReport(null);

    // Fly map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 14);
      // Add marker
      void import('leaflet').then((L) => {
        if (searchMarkerRef.current) searchMarkerRef.current.remove();
        const icon = L.divIcon({ html: '<span class="material-symbols-outlined" style="font-size:32px;color:var(--green-400)">location_on</span>', className: '', iconSize: [32, 32], iconAnchor: [16, 32] });
        searchMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current!);
      });
    }

    // Fetch weather from OpenWeatherMap
    const liveData: LivePlaceData = { name: result.display_name.split(',')[0], lat, lng, displayName: result.display_name };
    try {
      const owmKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      if (owmKey) {
        const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${owmKey}`);
        if (wRes.ok) {
          const w = await wRes.json();
          liveData.weather = { temp: w.main.temp, humidity: w.main.humidity, description: w.weather?.[0]?.description ?? '', windSpeed: w.wind?.speed ?? 0 };
        }
        const aRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${owmKey}`);
        if (aRes.ok) {
          const a = await aRes.json();
          const pm25 = a.list?.[0]?.components?.pm2_5 ?? 0;
          liveData.aqi = { pm25, overall: a.list?.[0]?.main?.aqi ?? 0 };
        }
      }
    } catch { /* weather optional */ }

    // Fetch forecast from Open-Meteo
    try {
      const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`);
      if (fRes.ok) {
        const f = await fRes.json();
        liveData.forecast = { dates: f.daily?.time ?? [], maxTemps: f.daily?.temperature_2m_max ?? [], minTemps: f.daily?.temperature_2m_min ?? [] };
      }
    } catch { /* forecast optional */ }

    setSearchedPlace(liveData);
    setSearchedPlaceLoading(false);
  }

  // Gemini analysis
  async function runGeminiAnalysis() {
    if (!searchedPlace) return;
    setGeminiLoading(true);
    try {
      const res = await fetch('/api/ai/place-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeName: searchedPlace.name,
          lat: searchedPlace.lat,
          lng: searchedPlace.lng,
          weather: searchedPlace.weather,
          aqi: searchedPlace.aqi,
          forecast: searchedPlace.forecast,
        }),
      });
      const data = await res.json();
      setGeminiReport(data.report ?? data.error ?? 'No analysis available');
    } catch { setGeminiReport('Failed to generate analysis'); }
    finally { setGeminiLoading(false); }
  }

  const zoomIn = useCallback(() => mapInstanceRef.current?.zoomIn(), []);
  const zoomOut = useCallback(() => mapInstanceRef.current?.zoomOut(), []);
  const inspectorPlace = selectedPlace || payload?.places[0] || null;

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)]">
      {/* Top bar with search */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shrink-0">
        <h1 className="text-sm font-semibold text-[var(--text-primary)] shrink-0">Map</h1>

        {/* Global search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">travel_explore</span>
          <input
            type="text" placeholder="Search any place globally..."
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
            onFocus={() => globalResults.length > 0 && setShowGlobalResults(true)}
            className="w-full h-8 pl-8 pr-16 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--green-400)]/40"
          />
          <button onClick={handleGlobalSearch} disabled={searchingGlobal} className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-medium bg-[var(--green-400)]/10 text-[var(--green-400)] rounded hover:bg-[var(--green-400)]/20">
            {searchingGlobal ? '...' : 'Search'}
          </button>
          {showGlobalResults && globalResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
              {globalResults.map((r) => (
                <button key={r.place_id} type="button" onClick={() => selectGlobalResult(r)} onBlur={() => setTimeout(() => setShowGlobalResults(false), 200)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors border-b border-[var(--border-default)] last:border-0">
                  <p className="text-[var(--text-primary)] font-medium truncate">{r.display_name.split(',')[0]}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)] truncate">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Local filter */}
        <div className="relative max-w-[180px]">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">filter_list</span>
          <input type="text" placeholder="Filter my places..." value={localQuery} onChange={(e) => setLocalQuery(e.target.value)}
            className="w-full h-8 pl-7 pr-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          {localQuery && localResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden">
              {localResults.map((n) => (
                <button key={n.id} type="button" onMouseDown={() => { flyToPlace(n); setLocalQuery(''); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors">
                  <span className="text-[var(--text-primary)]">{n.name}</span>
                  <span className="ml-2 text-[10px]" style={{ color: VULN_COLORS[n.vulnerabilityLevel] || '#22c55e' }}>{n.vulnerabilityLevel}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px] min-h-0">
        {/* Left sidebar */}
        <aside className="bg-[var(--bg-surface)] border-r border-[var(--border-default)] p-3 overflow-y-auto hidden lg:flex lg:flex-col gap-3">
          <div>
            <h2 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>Stats
            </h2>
            <div className="border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)]">
              <div className="flex justify-between px-3 py-2"><span className="text-[10px] font-semibold text-[var(--critical)]">Critical</span><span className="text-lg font-bold text-[var(--text-primary)]">{payload?.stats.criticalCount ?? 0}</span></div>
              <div className="flex justify-between px-3 py-2"><span className="text-[10px] font-semibold text-[var(--high)]">High Risk</span><span className="text-lg font-bold text-[var(--text-primary)]">{payload?.stats.highCount ?? 0}</span></div>
              <div className="flex justify-between px-3 py-2"><span className="text-[10px] font-semibold text-[var(--info)]">Interventions</span><span className="text-lg font-bold text-[var(--text-primary)]">{payload?.stats.interventionCount ?? 0}</span></div>
            </div>
          </div>

          {canEdit && (
            <div className="space-y-1.5">
              <Link href="/dashboard/interventions" className="flex items-center justify-center gap-1 h-8 w-full text-xs font-medium bg-[var(--green-500)] text-white rounded-md hover:bg-[var(--green-400)] transition-colors">
                <span className="material-symbols-outlined text-xs">add</span>Add Intervention
              </Link>
              <Link href="/dashboard/scenarios/new" className="flex items-center justify-center h-8 w-full text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-md hover:bg-[var(--bg-elevated)] transition-colors">Build Scenario</Link>
            </div>
          )}

          {/* Legend */}
          <div className="border-t border-[var(--border-default)] pt-2">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1.5">Vulnerability</h3>
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((l) => (
              <div key={l} className="flex items-center gap-2 py-0.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: VULN_COLORS[l] }} /><span className="text-[11px] text-[var(--text-secondary)] capitalize">{l.toLowerCase()}</span></div>
            ))}
          </div>

          {/* Place list */}
          {payload && payload.places.length > 0 && (
            <div className="border-t border-[var(--border-default)] pt-2 flex-1 flex flex-col min-h-0">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-1.5">Places ({payload.places.length})</h3>
              <div className="flex-1 overflow-y-auto space-y-0.5">
                {payload.places.map((n) => (
                  <button key={n.id} type="button" onClick={() => flyToPlace(n)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--bg-elevated)] transition-colors text-left ${selectedPlace?.id === n.id ? 'bg-[var(--bg-elevated)]' : ''}`}>
                    <span className="text-[11px] text-[var(--text-secondary)] truncate">{n.name}</span>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-1" style={{ backgroundColor: VULN_COLORS[n.vulnerabilityLevel] || '#22c55e' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Map area */}
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
          <div ref={mapRef} className="h-full w-full" />

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1">
            <button type="button" onClick={zoomIn} className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] shadow-lg"><span className="material-symbols-outlined text-sm">add</span></button>
            <button type="button" onClick={zoomOut} className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] shadow-lg"><span className="material-symbols-outlined text-sm">remove</span></button>
          </div>

          {/* Tile toggle */}
          <div className="absolute bottom-16 right-4 z-[400] flex flex-col gap-px bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden shadow-lg">
            {(['dark', 'satellite', 'street'] as const).map((s) => (
              <button key={s} onClick={() => setTileStyle(s)} className={`px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.04em] transition-colors ${tileStyle === s ? 'bg-[var(--green-500)] text-white' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]'}`}>{TILE_LAYERS[s].label}</button>
            ))}
          </div>

          {/* Mobile legend */}
          <div className="absolute bottom-4 left-4 z-[400] lg:hidden bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border-default)] rounded-md p-2">
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((l) => (
              <div key={l} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: VULN_COLORS[l] }} /><span className="text-[10px] text-[var(--text-secondary)] capitalize">{l.toLowerCase()}</span></div>
            ))}
          </div>
        </section>

        {/* Right sidebar — Inspector */}
        <aside className="bg-[var(--bg-surface)] border-l border-[var(--border-default)] p-4 overflow-y-auto">
          {/* Searched external place panel */}
          {searchedPlaceLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-5 h-5 border-2 border-[var(--green-400)]/30 border-t-[var(--green-400)] rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Fetching live data…</span>
            </div>
          ) : searchedPlace ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{searchedPlace.name}</h2>
                <button onClick={() => { setSearchedPlace(null); if (searchMarkerRef.current) searchMarkerRef.current.remove(); }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-tertiary)]">{searchedPlace.displayName}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{searchedPlace.lat.toFixed(4)}, {searchedPlace.lng.toFixed(4)}</p>

              {searchedPlace.weather && (
                <div className="border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)] text-xs">
                  <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Temperature</span><span className="font-medium text-[var(--text-primary)]">{searchedPlace.weather.temp.toFixed(1)}°C</span></div>
                  <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Humidity</span><span className="font-medium text-[var(--text-primary)]">{searchedPlace.weather.humidity}%</span></div>
                  <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Wind</span><span className="font-medium text-[var(--text-primary)]">{searchedPlace.weather.windSpeed} m/s</span></div>
                  <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Conditions</span><span className="font-medium text-[var(--text-primary)] capitalize">{searchedPlace.weather.description}</span></div>
                </div>
              )}

              {searchedPlace.aqi && (
                <div className="border border-[var(--border-default)] rounded-md p-3 text-xs">
                  <span className="text-[var(--text-tertiary)]">Air Quality</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-[var(--text-primary)]">AQI {searchedPlace.aqi.overall}</span>
                    <span className="text-[var(--text-tertiary)]">PM2.5: {searchedPlace.aqi.pm25.toFixed(1)} µg/m³</span>
                  </div>
                </div>
              )}

              {searchedPlace.forecast && (
                <div className="border border-[var(--border-default)] rounded-md p-3 text-xs">
                  <h3 className="text-[10px] font-medium uppercase text-[var(--text-tertiary)] mb-2">7-Day Forecast</h3>
                  <div className="space-y-1">
                    {searchedPlace.forecast.dates.map((d, i) => (
                      <div key={d} className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">{new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                        <span className="text-[var(--text-primary)]">
                          <span className="text-[var(--critical)]">{searchedPlace.forecast!.maxTemps[i]?.toFixed(0)}°</span>
                          {' / '}
                          <span className="text-[var(--info)]">{searchedPlace.forecast!.minTemps[i]?.toFixed(0)}°</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Analysis Button */}
              <button onClick={runGeminiAnalysis} disabled={geminiLoading}
                className="w-full flex items-center justify-center gap-1.5 h-9 text-xs font-medium bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                {geminiLoading ? 'Analyzing with Gemini…' : 'AI Heat Analysis'}
              </button>

              {geminiReport && (
                <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-500/5">
                  <h3 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span>Gemini Analysis
                  </h3>
                  <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{geminiReport}</div>
                </div>
              )}
            </div>
          ) : selectedIntervention ? (
            /* Intervention detail */
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selectedIntervention.name}</h2>
                <button onClick={() => setSelectedIntervention(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5"><span className="material-symbols-outlined text-base">close</span></button>
              </div>
              <div className="mt-3 border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)] text-xs">
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Status</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.status.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Place</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.placeName || 'City-wide'}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Cooling</span><span className="font-semibold text-[var(--green-400)]">{selectedIntervention.estimatedTempReductionC != null ? `-${selectedIntervention.estimatedTempReductionC.toFixed(1)}°C` : '—'}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Budget</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.estimatedCostUsd != null ? `$${Math.round(selectedIntervention.estimatedCostUsd).toLocaleString()}` : 'Pending'}</span></div>
              </div>
            </>
          ) : inspectorPlace ? (
            /* Place detail */
            <>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{inspectorPlace.name}</h2>
              <div className="mt-1.5">
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.05em] rounded px-2 py-0.5"
                  style={{ backgroundColor: `${VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e'}1a`, borderColor: `${VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e'}4d`, borderWidth: '1px', color: VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e' }}>
                  {inspectorPlace.vulnerabilityLevel} · Score {inspectorPlace.vulnerabilityScore}
                </span>
              </div>
              <div className="mt-3 border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)] text-xs">
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Population</span><span className="font-medium text-[var(--text-primary)]">{inspectorPlace.population?.toLocaleString() || '—'}</span></div>
                {inspectorPlace.avgTemp != null && <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Avg temp</span><span className="font-medium text-[var(--text-primary)]">{inspectorPlace.avgTemp.toFixed(1)}°C</span></div>}
                {inspectorPlace.maxTemp != null && <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Max temp</span><span className="font-semibold text-[var(--high)]">{inspectorPlace.maxTemp.toFixed(1)}°C</span></div>}
                {inspectorPlace.treeCanopyPct != null && <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Tree canopy</span><span className="font-medium text-[var(--green-400)]">{inspectorPlace.treeCanopyPct.toFixed(0)}%</span></div>}
              </div>
              {inspectorPlace.avgTemp != null && (
                <div className="mt-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md">
                  <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1.5"><span>Heat Intensity</span><span>{inspectorPlace.avgTemp.toFixed(1)}°C avg</span></div>
                  <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(8, ((inspectorPlace.avgTemp - 20) / 25) * 100))}%`, backgroundColor: VULN_COLORS[inspectorPlace.vulnerabilityLevel] || '#22c55e' }} />
                  </div>
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] pb-2 border-b border-[var(--border-default)]">Interventions in this area</h3>
                {inspectorPlace.interventions.length === 0 ? <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">No interventions yet.</p> : (
                  <div className="mt-2 space-y-1.5">
                    {inspectorPlace.interventions.map((intervention) => (
                      <button key={intervention.id} type="button" onClick={() => { const full = payload?.interventions.find((i) => i.id === intervention.id) || null; setSelectedIntervention(full); }}
                        className="w-full border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-left rounded-md hover:bg-[var(--bg-base)] transition-colors">
                        <div className="font-medium text-[var(--text-primary)] text-xs">{intervention.name}</div>
                        <div className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">{intervention.status.replace(/_/g, ' ')} · {intervention.estimatedTempReductionC != null ? `-${intervention.estimatedTempReductionC.toFixed(1)}°C` : 'Pending'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <span className="material-symbols-outlined text-2xl text-[var(--text-tertiary)] mb-2">touch_app</span>
              <p className="text-xs text-[var(--text-tertiary)]">Select a place on the map or search globally.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
