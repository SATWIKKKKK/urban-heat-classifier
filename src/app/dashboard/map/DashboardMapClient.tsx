'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, useJsApiLoader, Polygon, Marker, Autocomplete } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { getInterventionStatusColor, type SupportedMapGeometry } from '@/lib/map-utils';
import type { CityMapPayload, CityMapPlace, CityMapIntervention } from '@/lib/map-data';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: Libraries = ['places'];
const MAP_CONTAINER_STYLE: React.CSSProperties = { width: '100%', height: '100%' };
const INITIAL_CENTER: google.maps.LatLngLiteral = { lat: 22.5, lng: 82.0 };

function geometryToPolygonPaths(geometry: SupportedMapGeometry): google.maps.LatLngLiteral[][][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates.map(ring => ring.map(([lng, lat]) => ({ lat, lng })))];
  }
  return geometry.coordinates.map(polygon =>
    polygon.map(ring => ring.map(([lng, lat]) => ({ lat, lng })))
  );
}

function extendBoundsWithGeometry(bounds: google.maps.LatLngBounds, geometry: SupportedMapGeometry) {
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
  } else {
    geometry.coordinates.forEach(poly => poly[0].forEach(([lng, lat]) => bounds.extend({ lat, lng })));
  }
}

const VULN_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e',
};

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f0f0f' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f0f' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#777' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#999' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1c1c1c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#444' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#222' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#666' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#111' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1628' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a4a6a' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#111' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#0d1a0d' }] },
];

const MAP_TYPE_OPTIONS = [
  { id: 'roadmap', label: 'Dark' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'hybrid', label: 'Hybrid' },
] as const;

type MapType = (typeof MAP_TYPE_OPTIONS)[number]['id'];

interface LivePlaceData {
  name: string; lat: number; lng: number; displayName: string;
  weather?: { temp: number; humidity: number; description: string; windSpeed: number };
  aqi?: { pm25: number; overall: number };
  forecast?: { dates: string[]; maxTemps: number[]; minTemps: number[] };
}

interface LiveVulnerabilityFactor {
  name: string; weight: number; value: string; points: number; maxPoints: number;
}

interface LiveVulnerabilityData {
  placeId: string;
  live: {
    temp: number | null; humidity: number | null; apparentTemp: number | null;
    windSpeed: number | null; todayMax: number | null; todayMin: number | null;
    precipToday: number | null; source: string; fetchedAt: string;
  };
  stored: { avgTemp: number | null; maxTemp: number | null; treeCanopyPct: number | null; imperviousSurfacePct: number | null; };
  vulnerability: {
    score: number; level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    factors: LiveVulnerabilityFactor[];
    topRisks: string[];
    improvementSuggestions: string[];
  };
}

export default function DashboardMapPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const role = session?.user?.role;
  const canEdit = ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(role ?? '');

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [mapType, setMapType] = useState<MapType>('roadmap');
  const [payload, setPayload] = useState<CityMapPayload | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CityMapPlace | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<CityMapIntervention | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localQuery, setLocalQuery] = useState('');
  const [searchedPlace, setSearchedPlace] = useState<LivePlaceData | null>(null);
  const [searchedPlaceLoading, setSearchedPlaceLoading] = useState(false);
  const [searchedMarkerPos, setSearchedMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [liveVuln, setLiveVuln] = useState<LiveVulnerabilityData | null>(null);
  const [liveVulnLoading, setLiveVulnLoading] = useState(false);

  const localResults = useMemo(() => {
    if (!localQuery.trim() || !payload) return [];
    const q = localQuery.toLowerCase();
    return payload.places.filter(n => n.name.toLowerCase().includes(q)).slice(0, 6);
  }, [localQuery, payload]);

  const cityQuery = useMemo(() => {
    if (status === 'loading') return null;
    if (session?.user?.cityId) return `/api/map-data?cityId=${encodeURIComponent(session.user.cityId)}&includeProposed=${canEdit}`;
    return null;
  }, [canEdit, session?.user?.cityId, status]);

  // Load city map data
  useEffect(() => {
    if (!cityQuery) { if (status !== 'loading') setLoading(false); return; }
    async function load() {
      setLoading(true); setError('');
      try {
        const res = await fetch(cityQuery!);
        const json = await res.json();
        if (!res.ok || 'error' in json || !('places' in json)) throw new Error(json.error ?? 'Failed to load map data');
        setPayload(json);
        const placeIdParam = searchParams.get('placeId');
        if (placeIdParam) {
          const found = (json.places as CityMapPlace[]).find(p => p.id === placeIdParam);
          if (found) setSelectedPlace(found);
        } else {
          setSelectedPlace((json.places as CityMapPlace[])[0] ?? null);
        }
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load map data'); }
      finally { setLoading(false); }
    }
    void load();
  }, [cityQuery, status, searchParams]);

  // Fetch real-time vulnerability when a place is selected
  useEffect(() => {
    if (!selectedPlace) { setLiveVuln(null); return; }
    setLiveVulnLoading(true);
    setLiveVuln(null);
    fetch(`/api/vulnerability/realtime?placeId=${encodeURIComponent(selectedPlace.id)}`)
      .then(r => r.json())
      .then((data: LiveVulnerabilityData) => { setLiveVuln(data); })
      .catch(() => { /* non-critical */ })
      .finally(() => setLiveVulnLoading(false));
  }, [selectedPlace?.id]);

  // Fly to city when payload + map both ready
  useEffect(() => {    if (!mapRef.current || !payload?.city.lat || !isLoaded) return;
    if (payload.places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      payload.places.forEach(p => extendBoundsWithGeometry(bounds, p.geometry));
      mapRef.current.fitBounds(bounds, 40);
    } else {
      mapRef.current.setCenter({ lat: payload.city.lat, lng: payload.city.lng });
      mapRef.current.setZoom(13);
    }
  }, [payload, isLoaded]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const flyToPlace = useCallback((place: CityMapPlace) => {
    if (!mapRef.current || !isLoaded) return;
    const bounds = new google.maps.LatLngBounds();
    extendBoundsWithGeometry(bounds, place.geometry);
    mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    setSelectedPlace(place);
    setSelectedIntervention(null);
    setSearchedPlace(null);
    setSearchedMarkerPos(null);
    setLocalQuery('');
    setGeminiReport(null);
  }, [isLoaded]);

  // Google Places Autocomplete place selection
  const onPlaceChanged = useCallback(async () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    // Update input display
    if (searchInputRef.current) {
      searchInputRef.current.value = place.name ?? place.formatted_address?.split(',')[0] ?? '';
    }

    setSearchedPlaceLoading(true);
    setSelectedPlace(null);
    setSelectedIntervention(null);
    setGeminiReport(null);
    setSearchedMarkerPos({ lat, lng });

    if (mapRef.current) {
      if (place.geometry.viewport) {
        mapRef.current.fitBounds(place.geometry.viewport);
      } else {
        mapRef.current.setCenter({ lat, lng });
        mapRef.current.setZoom(14);
      }
    }

    const liveData: LivePlaceData = {
      name: place.name ?? place.formatted_address?.split(',')[0] ?? 'Unknown place',
      lat, lng,
      displayName: place.formatted_address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };

    // Fetch weather
    try {
      const owmKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
      if (owmKey) {
        const [wRes, aRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${owmKey}`),
          fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${owmKey}`),
        ]);
        if (wRes.ok) {
          const w = await wRes.json() as { main: { temp: number; humidity: number }; weather: { description: string }[]; wind: { speed: number } };
          liveData.weather = { temp: w.main.temp, humidity: w.main.humidity, description: w.weather?.[0]?.description ?? '', windSpeed: w.wind?.speed ?? 0 };
        }
        if (aRes.ok) {
          const a = await aRes.json() as { list: { components: { pm2_5: number }; main: { aqi: number } }[] };
          liveData.aqi = { pm25: a.list?.[0]?.components?.pm2_5 ?? 0, overall: a.list?.[0]?.main?.aqi ?? 0 };
        }
      }
    } catch { /* weather optional */ }

    // Fetch forecast
    try {
      const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`);
      if (fRes.ok) {
        const f = await fRes.json() as { daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
        liveData.forecast = { dates: f.daily?.time ?? [], maxTemps: f.daily?.temperature_2m_max ?? [], minTemps: f.daily?.temperature_2m_min ?? [] };
      }
    } catch { /* forecast optional */ }

    setSearchedPlace(liveData);
    setSearchedPlaceLoading(false);
  }, []);

  async function runGeminiAnalysis() {
    if (!searchedPlace) return;
    setGeminiLoading(true);
    try {
      const res = await fetch('/api/ai/place-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName: searchedPlace.name, lat: searchedPlace.lat, lng: searchedPlace.lng, weather: searchedPlace.weather, aqi: searchedPlace.aqi, forecast: searchedPlace.forecast }),
      });
      const data = await res.json() as { report?: string; error?: string };
      setGeminiReport(data.report ?? data.error ?? 'No analysis available');
    } catch { setGeminiReport('Failed to generate analysis'); }
    finally { setGeminiLoading(false); }
  }

  const zoomIn = useCallback(() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1), []);
  const zoomOut = useCallback(() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1), []);
  const inspectorPlace = selectedPlace ?? payload?.places[0] ?? null;

  const mapOptions = useMemo((): google.maps.MapOptions => ({
    mapTypeId: mapType,
    styles: mapType === 'roadmap' ? DARK_MAP_STYLE : undefined,
    disableDefaultUI: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
  }), [mapType]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Top bar with search */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-default)] shrink-0">
        <h1 className="text-sm font-semibold text-[var(--text-primary)] shrink-0">Map</h1>

        {/* Google Places Autocomplete search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)] z-10 pointer-events-none">travel_explore</span>
          {isLoaded ? (
            <Autocomplete
              onLoad={(auto) => { autocompleteRef.current = auto; }}
              onPlaceChanged={onPlaceChanged}
            >
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search any place globally…"
                className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--green-400)]/40"
              />
            </Autocomplete>
          ) : (
            <input
              type="text"
              placeholder={loadError ? 'Google Maps unavailable' : 'Loading Google Maps…'}
              disabled
              className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-tertiary)] opacity-50"
            />
          )}
        </div>

        {/* Local filter */}
        <div className="relative max-w-[180px]">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[var(--text-tertiary)]">filter_list</span>
          <input
            type="text" placeholder="Filter my places…" value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="w-full h-8 pl-7 pr-2 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
          />
          {localQuery && localResults.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden">
              {localResults.map((n) => (
                <button key={n.id} type="button" onMouseDown={() => { flyToPlace(n); setLocalQuery(''); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-elevated)] transition-colors">
                  <span className="text-[var(--text-primary)]">{n.name}</span>
                  <span className="ml-2 text-[10px]" style={{ color: VULN_COLORS[n.vulnerabilityLevel] ?? '#22c55e' }}>{n.vulnerabilityLevel}</span>
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
              <div key={l} className="flex items-center gap-2 py-0.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: VULN_COLORS[l] }} />
                <span className="text-[11px] text-[var(--text-secondary)] capitalize">{l.toLowerCase()}</span>
              </div>
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
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 ml-1" style={{ backgroundColor: VULN_COLORS[n.vulnerabilityLevel] ?? '#22c55e' }} />
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
          {loadError && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[var(--bg-base)]/90 px-6">
              <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg p-5 text-center max-w-sm">
                <span className="material-symbols-outlined text-xl text-[var(--critical)]">map</span>
                <p className="mt-2 text-xs text-[var(--critical)]">Google Maps failed to load. Check your API key.</p>
              </div>
            </div>
          )}

          {isLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={INITIAL_CENTER}
              zoom={4}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              {/* Place polygons */}
              {payload?.places.flatMap(place => {
                const color = VULN_COLORS[place.vulnerabilityLevel] ?? '#22c55e';
                const isSelected = selectedPlace?.id === place.id;
                const isHovered = hoveredPlaceId === place.id;
                const allPolygonPaths = geometryToPolygonPaths(place.geometry);
                return allPolygonPaths.map((paths, pIdx) => (
                  <Polygon
                    key={`${place.id}-${pIdx}`}
                    paths={paths}
                    options={{
                      fillColor: color,
                      fillOpacity: isSelected || isHovered ? 0.6 : 0.35,
                      strokeColor: isSelected ? 'rgba(255,255,255,0.4)' : isHovered ? 'rgba(255,255,255,0.15)' : 'transparent',
                      strokeWeight: isSelected ? 1.5 : isHovered ? 1 : 0,
                      clickable: true,
                    }}
                    onClick={() => { setSelectedPlace(place); setSelectedIntervention(null); setSearchedPlace(null); setSearchedMarkerPos(null); setGeminiReport(null); }}
                    onMouseOver={() => setHoveredPlaceId(place.id)}
                    onMouseOut={() => setHoveredPlaceId(null)}
                  />
                ));
              })}

              {/* Intervention circle markers */}
              {payload?.interventions.map(intervention => (
                <Marker
                  key={intervention.id}
                  position={{ lat: intervention.point[0], lng: intervention.point[1] }}
                  options={{
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 6,
                      fillColor: getInterventionStatusColor(intervention.status),
                      fillOpacity: 0.9,
                      strokeColor: '#ffffff',
                      strokeWeight: 1.5,
                    },
                    title: intervention.name,
                  }}
                  onClick={() => {
                    setSelectedIntervention(intervention);
                    setSelectedPlace(payload.places.find(n => n.id === intervention.placeId) ?? null);
                    setSearchedPlace(null);
                    setSearchedMarkerPos(null);
                  }}
                />
              ))}

              {/* Searched place pin */}
              {searchedMarkerPos && (
                <Marker
                  position={searchedMarkerPos}
                  options={{
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 9,
                      fillColor: '#22c55e',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2.5,
                    },
                  }}
                />
              )}
            </GoogleMap>
          )}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1">
            <button type="button" onClick={zoomIn} className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] shadow-lg">
              <span className="material-symbols-outlined text-sm">add</span>
            </button>
            <button type="button" onClick={zoomOut} className="w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] shadow-lg">
              <span className="material-symbols-outlined text-sm">remove</span>
            </button>
          </div>

          {/* Map type toggle */}
          <div className="absolute bottom-16 right-4 z-[400] flex flex-col gap-px bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md overflow-hidden shadow-lg">
            {MAP_TYPE_OPTIONS.map(({ id, label }) => (
              <button key={id} onClick={() => setMapType(id)}
                className={`px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.04em] transition-colors ${mapType === id ? 'bg-[var(--green-500)] text-white' : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)]'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Mobile legend */}
          <div className="absolute bottom-4 left-4 z-[400] lg:hidden bg-[var(--bg-surface)]/90 backdrop-blur-sm border border-[var(--border-default)] rounded-md p-2">
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((l) => (
              <div key={l} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: VULN_COLORS[l] }} />
                <span className="text-[10px] text-[var(--text-secondary)] capitalize">{l.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Right sidebar — Inspector */}
        <aside className="bg-[var(--bg-surface)] border-l border-[var(--border-default)] p-4 overflow-y-auto">
          {searchedPlaceLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-5 h-5 border-2 border-[var(--green-400)]/30 border-t-[var(--green-400)] rounded-full animate-spin" />
              <span className="text-xs text-[var(--text-secondary)]">Fetching live data…</span>
            </div>
          ) : searchedPlace ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{searchedPlace.name}</h2>
                <button onClick={() => { setSearchedPlace(null); setSearchedMarkerPos(null); }}
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
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selectedIntervention.name}</h2>
                <button onClick={() => setSelectedIntervention(null)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-0.5">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
              <div className="mt-3 border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)] text-xs">
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Status</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.status.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Place</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.placeName ?? 'City-wide'}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Cooling</span><span className="font-semibold text-[var(--green-400)]">{selectedIntervention.estimatedTempReductionC != null ? `-${selectedIntervention.estimatedTempReductionC.toFixed(1)}°C` : '—'}</span></div>
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Budget</span><span className="font-medium text-[var(--text-primary)]">{selectedIntervention.estimatedCostUsd != null ? `$${Math.round(selectedIntervention.estimatedCostUsd).toLocaleString()}` : 'Pending'}</span></div>
              </div>
            </>
          ) : inspectorPlace ? (
            <>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{inspectorPlace.name}</h2>
              <div className="mt-1.5">
                {/* Show live vulnerability if available, else stored */}
                {(() => {
                  const displayLevel = liveVuln?.vulnerability.level ?? inspectorPlace.vulnerabilityLevel;
                  const displayScore = liveVuln?.vulnerability.score ?? inspectorPlace.vulnerabilityScore;
                  const isLive = !!liveVuln;
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.05em] rounded px-2 py-0.5"
                        style={{ backgroundColor: `${VULN_COLORS[displayLevel] ?? '#22c55e'}1a`, borderColor: `${VULN_COLORS[displayLevel] ?? '#22c55e'}4d`, borderWidth: '1px', color: VULN_COLORS[displayLevel] ?? '#22c55e' }}>
                        {displayLevel} · Score {displayScore}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded px-1.5 py-0.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />LIVE
                        </span>
                      )}
                      {liveVulnLoading && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-[var(--text-tertiary)]">
                          <div className="w-2.5 h-2.5 border border-[var(--green-400)]/30 border-t-[var(--green-400)] rounded-full animate-spin" />fetching live data…
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Live temperature panel */}
              {liveVuln?.live && (
                <div className="mt-2 border border-emerald-500/20 bg-emerald-500/5 rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>thermostat</span>
                      Live Conditions
                    </span>
                    <span className="text-[9px] text-[var(--text-tertiary)]">
                      {new Date(liveVuln.live.fetchedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    {liveVuln.live.temp !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Temp</span><span className="font-semibold text-[var(--text-primary)] ml-1">{liveVuln.live.temp.toFixed(1)}°C</span></div>
                    )}
                    {liveVuln.live.apparentTemp !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Feels</span><span className="font-medium text-[var(--text-primary)] ml-1">{liveVuln.live.apparentTemp.toFixed(1)}°C</span></div>
                    )}
                    {liveVuln.live.humidity !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Humidity</span><span className="font-medium text-[var(--text-primary)] ml-1">{liveVuln.live.humidity}%</span></div>
                    )}
                    {liveVuln.live.windSpeed !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Wind</span><span className="font-medium text-[var(--text-primary)] ml-1">{liveVuln.live.windSpeed} km/h</span></div>
                    )}
                    {liveVuln.live.todayMax !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Max today</span><span className="font-semibold text-[var(--high)] ml-1">{liveVuln.live.todayMax.toFixed(1)}°C</span></div>
                    )}
                    {liveVuln.live.todayMin !== null && (
                      <div><span className="text-[var(--text-tertiary)]">Min today</span><span className="font-medium text-[var(--info)] ml-1">{liveVuln.live.todayMin.toFixed(1)}°C</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Vulnerability factors breakdown */}
              {liveVuln?.vulnerability.factors && liveVuln.vulnerability.factors.length > 0 && (
                <div className="mt-2 border border-[var(--border-default)] rounded-md p-3">
                  <h3 className="text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)] mb-2">Risk Factors</h3>
                  <div className="space-y-2">
                    {liveVuln.vulnerability.factors.map((f) => {
                      const pct = Math.round((f.points / f.maxPoints) * 100);
                      const barColor = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f97316' : pct >= 40 ? '#eab308' : '#22c55e';
                      return (
                        <div key={f.name}>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-[var(--text-secondary)]">{f.name}</span>
                            <span className="text-[var(--text-tertiary)]">{f.value} · {f.points}/{f.maxPoints}pts</span>
                          </div>
                          <div className="h-1 bg-[var(--bg-base)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {liveVuln.vulnerability.topRisks.length > 0 && (
                    <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                      Top risks: <span className="text-[var(--text-secondary)]">{liveVuln.vulnerability.topRisks.join(', ')}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 border border-[var(--border-default)] rounded-md divide-y divide-[var(--border-default)] text-xs">
                <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Population</span><span className="font-medium text-[var(--text-primary)]">{inspectorPlace.population?.toLocaleString() ?? '—'}</span></div>
                {(liveVuln?.stored.treeCanopyPct ?? inspectorPlace.treeCanopyPct) != null && <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Tree canopy</span><span className="font-medium text-[var(--green-400)]">{(liveVuln?.stored.treeCanopyPct ?? inspectorPlace.treeCanopyPct)!.toFixed(0)}%</span></div>}
                {(liveVuln?.stored.imperviousSurfacePct ?? inspectorPlace.imperviousSurfacePct) != null && <div className="flex justify-between px-3 py-2"><span className="text-[var(--text-tertiary)]">Impervious surface</span><span className="font-medium text-[var(--text-primary)]">{(liveVuln?.stored.imperviousSurfacePct ?? inspectorPlace.imperviousSurfacePct)!.toFixed(0)}%</span></div>}
              </div>

              {/* Heat intensity bar using live score */}
              {(() => {
                const score = liveVuln?.vulnerability.score ?? inspectorPlace.vulnerabilityScore;
                const level = liveVuln?.vulnerability.level ?? inspectorPlace.vulnerabilityLevel;
                return score > 0 ? (
                  <div className="mt-2 p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md">
                    <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1.5">
                      <span>Vulnerability Score</span>
                      <span>{score}/100</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: VULN_COLORS[level] ?? '#22c55e' }} />
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="mt-4 pt-3 border-t border-[var(--border-default)]">
                <h3 className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] pb-2 border-b border-[var(--border-default)]">Interventions in this area</h3>
                {inspectorPlace.interventions.length === 0 ? (
                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">No interventions yet.</p>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    {inspectorPlace.interventions.map((intervention) => (
                      <button key={intervention.id} type="button"
                        onClick={() => { const full = payload?.interventions.find(i => i.id === intervention.id) ?? null; setSelectedIntervention(full); }}
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