'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { GoogleMap, useJsApiLoader, Polygon, Marker, Autocomplete } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { type SupportedMapGeometry } from '@/lib/map-utils';
import type { CityMapPayload, CityMapPlace } from '@/lib/map-data';
import { countryName, countryFlag } from '@/lib/utils/countryCodeMapping';

/* ── Recharts charts (client-only, lazy-loaded) ── */
const TempAnomalyChart = dynamic(() => import('@/components/climate/TempAnomalyChart'), { ssr: false });
const SectorImpactChart = dynamic(() => import('@/components/climate/SectorImpactChart'), { ssr: false });
const PopExposureChart = dynamic(() => import('@/components/climate/PopExposureChart'), { ssr: false });

/* â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: Libraries = ['places'];
const MAP_CONTAINER: React.CSSProperties = { width: '100%', height: '100%' };
const INITIAL_CENTER: google.maps.LatLngLiteral = { lat: 22.5, lng: 82.0 };

const VULN_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MODERATE: '#eab308', LOW: '#22c55e',
};
const VULN_LABEL_COLORS: Record<string, string> = {
  CRITICAL: 'Amber', HIGH: 'Amber', MODERATE: 'Green', LOW: 'Green',
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

/* â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function geometryToPolygonPaths(geometry: SupportedMapGeometry): google.maps.LatLngLiteral[][][] {
  if (geometry.type === 'Polygon') {
    return [geometry.coordinates.map(ring => ring.map(([lng, lat]) => ({ lat, lng })))];
  }
  return geometry.coordinates.map(polygon => polygon.map(ring => ring.map(([lng, lat]) => ({ lat, lng }))));
}

function extendBoundsWithGeometry(bounds: google.maps.LatLngBounds, geometry: SupportedMapGeometry) {
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach(([lng, lat]) => bounds.extend({ lat, lng }));
  } else {
    geometry.coordinates.forEach(poly => poly[0].forEach(([lng, lat]) => bounds.extend({ lat, lng })));
  }
}

function extendBoundsWithPlace(bounds: google.maps.LatLngBounds, place: CityMapPlace) {
  if (place.hasBoundary) {
    extendBoundsWithGeometry(bounds, place.geometry);
    return;
  }

  bounds.extend({ lat: place.center[0], lng: place.center[1] });
}

/* â”€â”€ Glass card wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#111113]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
      {children}
    </div>
  );
}

/* â”€â”€ Inline SVG mini-charts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* Charts are loaded dynamically (TempAnomalyChart, SectorImpactChart, PopExposureChart) */

/* â”€â”€ Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

interface LivePlaceData {
  name: string; lat: number; lng: number; displayName: string;
  countryCode?: string; countryLongName?: string;
  weather?: { temp: number; humidity: number; description: string; windSpeed: number };
  aqi?: { pm25: number; overall: number };
  forecast?: { dates: string[]; maxTemps: number[]; minTemps: number[] };
}

interface CountryStats {
  extremeHeatZones: number | null;
  activeInterventions: number | null;
  highRiskRegions: number | null;
  source?: string;
}

interface LiveVulnerabilityFactor {
  name: string; weight: number; value: string; points: number; maxPoints: number;
}

interface LiveVulnerabilityData {
  placeId: string;
  live: { temp: number | null; humidity: number | null; apparentTemp: number | null; windSpeed: number | null; todayMax: number | null; todayMin: number | null; precipToday: number | null; source: string; fetchedAt: string };
  stored: { avgTemp: number | null; maxTemp: number | null; treeCanopyPct: number | null; imperviousSurfacePct: number | null };
  vulnerability: { score: number; level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'; factors: LiveVulnerabilityFactor[]; topRisks: string[]; improvementSuggestions: string[] };
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  DashboardMapPage â€” full-bleed map with floating glassmorphism overlays      */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function DashboardMapPage() {
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });
  const { data: session, status, update } = useSession();
  const searchParams = useSearchParams();
  const role = session?.user?.role;
  const canEdit = ['URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN'].includes(role ?? '');

  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [mapType, setMapType] = useState<MapType>('roadmap');
  const [mapActive, setMapActive] = useState(false);
  const [scrollTipSeen, setScrollTipSeen] = useState(false);
  const [showScrollTip, setShowScrollTip] = useState(false);
  const [worldView, setWorldView] = useState(false);
  const [payload, setPayload] = useState<CityMapPayload | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<CityMapPlace | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noCityData, setNoCityData] = useState(false);
  const [searchedPlace, setSearchedPlace] = useState<LivePlaceData | null>(null);
  const [searchedPlaceLoading, setSearchedPlaceLoading] = useState(false);
  const [searchedMarkerPos, setSearchedMarkerPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [geminiReport, setGeminiReport] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [liveVuln, setLiveVuln] = useState<LiveVulnerabilityData | null>(null);
  const [liveVulnLoading, setLiveVulnLoading] = useState(false);
  const [rightPanel, setRightPanel] = useState<'trends' | 'inspector'>('trends');
  const [mobilePanel, setMobilePanel] = useState<'none' | 'stats' | 'inspector'>('none');

  /* country + stats */
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [countryStats, setCountryStats] = useState<CountryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  /* city save */
  const [savingCity, setSavingCity] = useState(false);
  const [citySaved, setCitySaved] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const inspectorPlace = selectedPlace ?? payload?.places[0] ?? null;
  const hasInspector = !!(searchedPlace || inspectorPlace);

  const cityQuery = useMemo(() => {
    if (status === 'loading') return null;
    if (session?.user?.cityId) return `/api/map-data?cityId=${encodeURIComponent(session.user.cityId)}&includeProposed=${canEdit}`;
    return null;
  }, [canEdit, session?.user?.cityId, status]);

  const loadCityPayload = useCallback(async (preferredPlaceId?: string | null) => {
    if (!cityQuery) return;

    setLoading(true);
    setError('');
    setNoCityData(false);

    try {
      const res = await fetch(cityQuery);
      const json = await res.json() as CityMapPayload | { error?: string };

      if (res.status === 404 || ('error' in json && json.error === 'City not found')) {
        setNoCityData(true);
        return;
      }

      if (!res.ok || 'error' in json || !('places' in json)) {
        throw new Error(('error' in json ? json.error : undefined) ?? 'Failed to load');
      }

      setPayload(json);

      const placeId = preferredPlaceId ?? searchParams.get('placeId');
      setSelectedPlace((current) => {
        const explicitMatch = placeId ? json.places.find((place) => place.id === placeId) ?? null : null;
        const currentMatch = current ? json.places.find((place) => place.id === current.id) ?? null : null;
        return explicitMatch ?? currentMatch ?? json.places[0] ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, [cityQuery, searchParams]);

  /* â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  useEffect(() => {
    if (!cityQuery) { if (status !== 'loading') setLoading(false); return; }
    void loadCityPayload();
  }, [cityQuery, loadCityPayload, status]);

  useEffect(() => {
    if (!selectedPlace) { setLiveVuln(null); return; }
    setLiveVulnLoading(true); setLiveVuln(null);
    fetch(`/api/vulnerability/realtime?placeId=${encodeURIComponent(selectedPlace.id)}`)
      .then(r => r.json()).then((d: LiveVulnerabilityData) => setLiveVuln(d)).catch(() => {})
      .finally(() => setLiveVulnLoading(false));
  }, [selectedPlace]);

  useEffect(() => {
    if (!mapRef.current || !payload?.city.lat || !isLoaded) return;
    if (payload.places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      payload.places.forEach(p => extendBoundsWithPlace(bounds, p));
      mapRef.current.fitBounds(bounds, 40);
    } else {
      mapRef.current.setCenter({ lat: payload.city.lat, lng: payload.city.lng });
      mapRef.current.setZoom(13);
    }
  }, [payload, isLoaded]);

  useEffect(() => {
    if (searchedPlace || selectedPlace) setRightPanel('inspector');
  }, [searchedPlace, selectedPlace]);

  /* Fetch country-level stats when country changes */
  useEffect(() => {
    if (!countryCode) return;
    setStatsLoading(true);
    setCountryStats(null);
    Promise.all([
      fetch(`/api/stats/extreme-heat-zones?country=${countryCode}`).then(r => r.json()),
      fetch(`/api/stats/active-interventions?country=${countryCode}`).then(r => r.json()),
      fetch(`/api/stats/high-risk-regions?country=${countryCode}`).then(r => r.json()),
    ]).then(([heatZones, interventions, highRisk]) => {
      setCountryStats({
        extremeHeatZones: (heatZones as { count?: number })?.count ?? null,
        activeInterventions: (interventions as { count?: number })?.count ?? null,
        highRiskRegions: (highRisk as { count?: number })?.count ?? null,
        source: 'World Bank Open Data',
      });
    }).catch(() => setCountryStats({ extremeHeatZones: null, activeInterventions: null, highRiskRegions: null }))
      .finally(() => setStatsLoading(false));
  }, [countryCode]);

  /* Restore scroll tip seen state from localStorage */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setScrollTipSeen(localStorage.getItem('mapScrollTipSeen') === 'true');
    }
  }, []);

  /* Restore last searched place from sessionStorage on mount (survives page reload) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const sp = sessionStorage.getItem('map_searchedPlace');
      const sm = sessionStorage.getItem('map_searchedMarkerPos');
      const cc = sessionStorage.getItem('map_countryCode');
      if (sp) { setSearchedPlace(JSON.parse(sp)); setRightPanel('inspector'); }
      if (sm) setSearchedMarkerPos(JSON.parse(sm));
      if (cc) setCountryCode(cc);
    } catch { /* ignore corrupt data */ }
  }, []);

  useEffect(() => {
    if (!searchInputRef.current || !searchedPlace) return;
    searchInputRef.current.value = searchedPlace.name;
  }, [searchedPlace]);

  /* Persist searched place to sessionStorage so it survives reload */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (searchedPlace) sessionStorage.setItem('map_searchedPlace', JSON.stringify(searchedPlace));
      else sessionStorage.removeItem('map_searchedPlace');
    } catch { /* ignore */ }
  }, [searchedPlace]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (searchedMarkerPos) sessionStorage.setItem('map_searchedMarkerPos', JSON.stringify(searchedMarkerPos));
      else sessionStorage.removeItem('map_searchedMarkerPos');
    } catch { /* ignore */ }
  }, [searchedMarkerPos]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (countryCode) sessionStorage.setItem('map_countryCode', countryCode);
      else sessionStorage.removeItem('map_countryCode');
    } catch { /* ignore */ }
  }, [countryCode]);

  /* Esc key deactivates map */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMapActive(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* World view: zoom out / in on toggle */
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    if (worldView) {
      mapRef.current.setZoom(2);
      mapRef.current.setCenter({ lat: 20, lng: 0 });
      return;
    }

    // When returning from world view, prefer the currently selected place (inspector),
    // then any searched place, then fall back to the city payload bounds.
    if (selectedPlace) {
      if (selectedPlace.hasBoundary) {
        const bounds = new google.maps.LatLngBounds();
        extendBoundsWithGeometry(bounds, selectedPlace.geometry);
        mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
      } else {
        mapRef.current.setCenter({ lat: selectedPlace.center[0], lng: selectedPlace.center[1] });
        mapRef.current.setZoom(12);
      }
      return;
    }

    if (searchedMarkerPos) {
      mapRef.current.setCenter(searchedMarkerPos);
      mapRef.current.setZoom(14);
      return;
    }

    if (payload?.city?.lat) {
      const bounds = new google.maps.LatLngBounds();
      if (payload.places && payload.places.length > 0) {
        payload.places.forEach(p => extendBoundsWithPlace(bounds, p));
        mapRef.current.fitBounds(bounds, 40);
      } else {
        mapRef.current.setCenter({ lat: payload.city.lat, lng: payload.city.lng });
        mapRef.current.setZoom(13);
      }
    }
  }, [worldView, isLoaded, payload, selectedPlace, searchedMarkerPos]);

  /* â”€â”€ Map callbacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  const onMapLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  const flyToPlace = useCallback((place: CityMapPlace) => {
    if (!mapRef.current || !isLoaded) return;
    if (place.hasBoundary) {
      const bounds = new google.maps.LatLngBounds();
      extendBoundsWithGeometry(bounds, place.geometry);
      mapRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    } else {
      mapRef.current.setCenter({ lat: place.center[0], lng: place.center[1] });
      mapRef.current.setZoom(12);
    }
    setSelectedPlace(place); setSearchedPlace(null); setSearchedMarkerPos(null); setGeminiReport(null); setCitySaved(false); setRightPanel('inspector'); setMobilePanel('inspector');
  }, [isLoaded]);

  const onPlaceChanged = useCallback(async () => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) return;
    const lat = place.geometry.location.lat(), lng = place.geometry.location.lng();
    if (searchInputRef.current) searchInputRef.current.value = place.name ?? place.formatted_address?.split(',')[0] ?? '';

    /* Extract country code from address_components */
    const countryComp = place.address_components?.find(c => c.types.includes('country'));
    const newCountryCode = countryComp?.short_name?.toLowerCase() ?? null;
    const newCountryLongName = countryComp?.long_name ?? null;
    if (newCountryCode) setCountryCode(newCountryCode);

    setSearchedPlaceLoading(true); setSelectedPlace(null); setGeminiReport(null);
    setSearchedMarkerPos({ lat, lng }); setCitySaved(false);

    if (mapRef.current) {
      if (place.geometry.viewport) mapRef.current.fitBounds(place.geometry.viewport);
      else { mapRef.current.setCenter({ lat, lng }); mapRef.current.setZoom(14); }
    }

    const live: LivePlaceData = {
      name: place.name ?? place.formatted_address?.split(',')[0] ?? 'Unknown',
      lat, lng,
      displayName: place.formatted_address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      countryCode: newCountryCode ?? undefined,
      countryLongName: newCountryLongName ?? undefined,
    };

    /* Fetch weather via server-side proxy (API key stays server-side) */
    try {
      const wRes = await fetch(`/api/climate/current-weather?lat=${lat}&lng=${lng}`);
      if (wRes.ok) {
        const w = await wRes.json() as { temp?: number; feelsLike?: number; humidity?: number; windSpeed?: number; description?: string; aqi?: number; pm25?: number };
        if (w.temp !== undefined) live.weather = { temp: w.temp, humidity: w.humidity ?? 0, description: w.description ?? '', windSpeed: w.windSpeed ?? 0 };
        if (w.aqi !== undefined) live.aqi = { pm25: w.pm25 ?? 0, overall: w.aqi };
      }
    } catch { /* optional */ }

    /* Open-Meteo forecast (free, no key required) */
    try {
      const fRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`);
      if (fRes.ok) { const f = await fRes.json() as { daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[] } }; live.forecast = { dates: f.daily?.time ?? [], maxTemps: f.daily?.temperature_2m_max ?? [], minTemps: f.daily?.temperature_2m_min ?? [] }; }
    } catch { /* optional */ }

    setSearchedPlace(live); setSearchedPlaceLoading(false); setRightPanel('inspector'); setMobilePanel('inspector');
  }, []);

  async function runGeminiAnalysis() {
    if (!searchedPlace) return;
    setGeminiLoading(true);
    try {
      const res = await fetch('/api/ai/place-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeName: searchedPlace.name, lat: searchedPlace.lat, lng: searchedPlace.lng, weather: searchedPlace.weather, aqi: searchedPlace.aqi, forecast: searchedPlace.forecast }) });
      const data = await res.json() as { report?: string; error?: string };
      setGeminiReport(data.report ?? data.error ?? 'No analysis available');
    } catch { setGeminiReport('Failed to generate analysis'); }
    finally { setGeminiLoading(false); }
  }

  async function saveCity() {
    if (!searchedPlace || !session?.user) return;
    setSavingCity(true);
    try {
      const res = await fetch('/api/cities/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchedPlace.name, country: searchedPlace.countryLongName ?? searchedPlace.countryCode, countryCode: searchedPlace.countryCode, lat: searchedPlace.lat, lng: searchedPlace.lng }),
      });
      const data = await res.json() as { cityId?: string; placeId?: string; preservedCityContext?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to save place');

      setCitySaved(true);
      setShowSaveSuccess(true);

      if (data.preservedCityContext) {
        await loadCityPayload(data.placeId ?? null);
      } else {
        await update();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save place');
    }
    finally { setSavingCity(false); }
  }

  const handleMapClick = useCallback(() => {
    setMapActive(true); setShowScrollTip(false);
    if (!scrollTipSeen) { setScrollTipSeen(true); if (typeof window !== 'undefined') localStorage.setItem('mapScrollTipSeen', 'true'); }
  }, [scrollTipSeen]);
  const handleMapMouseEnter = useCallback(() => { if (!scrollTipSeen && !mapActive) setShowScrollTip(true); }, [scrollTipSeen, mapActive]);
  const handleMapMouseLeave = useCallback(() => { setMapActive(false); setShowScrollTip(false); }, []);

  const zoomIn = useCallback(() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1), []);
  const zoomOut = useCallback(() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1), []);

  const mapOptions = useMemo((): google.maps.MapOptions => ({
    mapTypeId: mapType, styles: mapType === 'roadmap' ? DARK_MAP_STYLE : undefined,
    disableDefaultUI: true, clickableIcons: false, gestureHandling: 'cooperative',
  }), [mapType]);

  /* Stats: prefer country-level API data, fallback to city payload */
  const displayStats = {
    extremeHeatZones: countryStats?.extremeHeatZones ?? (payload?.stats.criticalCount ?? 0) + (payload?.stats.highCount ?? 0),
    activeInterventions: countryStats?.activeInterventions ?? payload?.stats.interventionCount ?? 0,
    highRisk: countryStats?.highRiskRegions ?? payload?.stats.highCount ?? 0,
  };
  const activeCountryName = countryCode ? countryName(countryCode) : null;
  const activeCountryFlag = countryCode ? countryFlag(countryCode) : '';

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  /*  RENDER                                                                   */
  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 60px)' }}>

      {/* â”€â”€â”€ FULL BLEED MAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="absolute inset-0 z-0"
        onClick={handleMapClick}
        onMouseEnter={handleMapMouseEnter}
        onMouseLeave={handleMapMouseLeave}
      >
        {mapActive && <div className="absolute inset-0 z-10 pointer-events-none border-2 border-[#22c55e]/40" />}
        {showScrollTip && !scrollTipSeen && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-[#111]/90 border border-white/10 rounded-full px-3 py-1.5 text-[10px] text-neutral-300 whitespace-nowrap">Click map to enable scroll zoom</div>
          </div>
        )}
        {mapActive && (
          <div className="absolute bottom-20 right-20 z-20 pointer-events-none">
            <div className="bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-full px-2 py-1 text-[9px] text-[#22c55e] font-medium">Scroll to zoom · Esc to exit</div>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#0a0a0a]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
              <span className="text-xs font-medium text-neutral-400">Loading map…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
            <GlassCard className="px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-red-400">error</span>
              <p className="text-xs text-red-400">{error}</p>
            </GlassCard>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-[#0a0a0a]/90">
            <GlassCard className="p-6 text-center max-w-xs">
              <span className="material-symbols-outlined text-2xl text-red-400">map</span>
              <p className="mt-2 text-xs text-red-400">Google Maps failed to load. </p>
            </GlassCard>
          </div>
        )}
        {isLoaded && (
          <GoogleMap mapContainerStyle={MAP_CONTAINER} center={INITIAL_CENTER} zoom={4} onLoad={onMapLoad} options={mapOptions}>
            {payload?.places.flatMap(place => {
              if (!place.hasBoundary) return [];
              const color = VULN_COLORS[place.vulnerabilityLevel] ?? '#22c55e';
              const isSel = selectedPlace?.id === place.id;
              const isHov = hoveredPlaceId === place.id;
              return geometryToPolygonPaths(place.geometry).map((paths, idx) => (
                <Polygon key={`${place.id}-${idx}`} paths={paths}
                  options={{ fillColor: color, fillOpacity: isSel || isHov ? 0.6 : 0.35, strokeColor: isSel ? 'rgba(255,255,255,0.4)' : isHov ? 'rgba(255,255,255,0.15)' : 'transparent', strokeWeight: isSel ? 1.5 : isHov ? 1 : 0, clickable: true }}
                  onClick={() => { setSelectedPlace(place); setSearchedPlace(null); setSearchedMarkerPos(null); setGeminiReport(null); }}
                  onMouseOver={() => setHoveredPlaceId(place.id)} onMouseOut={() => setHoveredPlaceId(null)} />
              ));
            })}
            {payload?.places.filter(place => !place.hasBoundary).map(place => {
              const isSel = selectedPlace?.id === place.id;
              return (
                <Marker
                  key={place.id}
                  position={{ lat: place.center[0], lng: place.center[1] }}
                  onClick={() => flyToPlace(place)}
                  options={{
                    title: place.name,
                    icon: {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: isSel ? 8 : 6,
                      fillColor: '#22c55e',
                      fillOpacity: 1,
                      strokeColor: '#fff',
                      strokeWeight: isSel ? 2.5 : 2,
                    },
                  }}
                />
              );
            })}
            {searchedMarkerPos && (
              <Marker position={searchedMarkerPos}
                onClick={() => { setRightPanel('inspector'); setMobilePanel('inspector'); }}
                options={{ icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#22c55e', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2.5 } }} />
            )}
          </GoogleMap>
        )}
      </div>

      {/* â”€â”€â”€ SEARCH BAR (centered, floating) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Search bar + world/city toggle (floating, centered top) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-[90%] max-w-xl">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-[#111113]/80 backdrop-blur-xl border border-white/[0.06] rounded-full p-1 self-center">
          <button type="button" onClick={() => setWorldView(false)}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${!worldView ? 'bg-[#22c55e] text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
            My City
          </button>
          <button type="button" onClick={() => setWorldView(true)}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors ${worldView ? 'bg-[#22c55e] text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
            World View
          </button>
        </div>

        <GlassCard className="w-full flex items-center px-4 py-2.5 gap-3">
          <span className="material-symbols-outlined text-lg text-neutral-400 shrink-0">search</span>
          {isLoaded ? (
            <Autocomplete onLoad={a => { autocompleteRef.current = a; }} onPlaceChanged={onPlaceChanged} className="flex-1">
              <input ref={searchInputRef} type="text" placeholder="Search any city or location worldwide…"
                className="w-full bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none" />
            </Autocomplete>
          ) : (
            <input type="text" placeholder={loadError ? 'Google Maps failed' : 'Loading Maps…'} disabled
              className="w-full bg-transparent text-sm text-neutral-500 focus:outline-none cursor-not-allowed" />
          )}
          {searchedPlaceLoading && <div className="w-4 h-4 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin shrink-0" />}
          {searchedPlace && !searchedPlaceLoading && !citySaved && session?.user && (
            <button
              onClick={() => { void saveCity(); }}
              disabled={savingCity}
              className="shrink-0 px-3 py-1 text-xs font-semibold text-[#22c55e] border border-[#22c55e]/40 rounded-lg hover:bg-[#22c55e]/10 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {savingCity ? 'Saving…' : 'Save Place'}
            </button>
          )}
          {citySaved && !searchedPlaceLoading && (
            <span className="shrink-0 text-xs text-[#22c55e] font-medium whitespace-nowrap">✓ Saved</span>
          )}
        </GlassCard>

        {/* No-city banner — only shows when needed, visible in document flow */}
        {noCityData && !searchedPlace && (
          <div className="w-full flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <span className="material-symbols-outlined text-sm text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>location_off</span>
            <span className="text-xs text-amber-400">No city assigned. Search to explore any location.</span>
          </div>
        )}

        {/* Country context pill */}
        {activeCountryName && (
          <div className="flex items-center gap-1.5 bg-[#111113]/70 backdrop-blur-xl border border-white/[0.05] rounded-full px-3 py-1 self-center pointer-events-none">
            {activeCountryFlag && <span className="text-sm">{activeCountryFlag}</span>}
            <span className="text-[10px] text-neutral-400">Showing: {activeCountryName}</span>
          </div>
        )}
      </div>

      {/* â”€â”€â”€ LEFT FLOATING PANELS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="absolute top-4 left-4 z-20 hidden lg:flex flex-col gap-3 w-[280px]">

        {/* Stats card */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Stats</h2>
            {statsLoading && <div className="w-3 h-3 border border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />}
          </div>
          {[
            { label: 'Extreme Heat Zones', value: displayStats.extremeHeatZones, dot: '#ef4444' },
            { label: 'High Risk', value: displayStats.highRisk, dot: '#f97316' },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.dot }} />
                <span className="text-sm text-neutral-300">{s.label}</span>
              </div>
              {statsLoading
                ? <div className="h-7 w-10 bg-white/[0.06] rounded animate-pulse" />
                : <span className="text-2xl font-bold text-white tabular-nums">{s.value ?? '—'}</span>
              }
            </div>
          ))}
          {countryStats?.source && <p className="mt-2 text-[9px] text-neutral-600">Source: {countryStats.source}</p>}
        </GlassCard>

        {/* Vulnerability legend */}
        <GlassCard className="p-5">
          <h2 className="text-base font-semibold text-white mb-3">Vulnerability</h2>
          <div className="space-y-2">
            {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(l => (
              <div key={l} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: VULN_COLORS[l] }} />
                  <span className="text-sm text-neutral-300 capitalize">{l.charAt(0) + l.slice(1).toLowerCase()}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: VULN_COLORS[l] }}>{VULN_LABEL_COLORS[l]}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Action buttons */}
        {canEdit && (
          <div className="space-y-2">
            <Link
              href={
                selectedPlace
                  ? `/dashboard/scenarios/new?placeId=${selectedPlace.id}`
                  : searchedPlace
                    ? `/dashboard/scenarios/new?placeName=${encodeURIComponent(searchedPlace.name)}&cityName=${encodeURIComponent(searchedPlace.name)}&countryName=${encodeURIComponent(searchedPlace.countryLongName ?? '')}&countryCode=${encodeURIComponent(searchedPlace.countryCode ?? '')}&lat=${searchedPlace.lat}&lng=${searchedPlace.lng}${searchedPlace.weather ? `&baselineTempC=${searchedPlace.weather.temp.toFixed(1)}` : ''}`
                    : '/dashboard/scenarios/new'
              }
              className="flex items-center justify-center gap-2 h-11 w-full text-sm font-semibold bg-[#22c55e] text-white rounded-xl hover:bg-[#16a34a] transition-colors shadow-lg shadow-[#22c55e]/20">
              Build Scenario
            </Link>
          </div>
        )}

        {/* Map type toggle */}
        <GlassCard className="flex flex-col overflow-hidden">
          <p className="text-[9px] font-medium uppercase tracking-wider text-neutral-500 px-3 pt-2 pb-1">Map Style</p>
          {MAP_TYPE_OPTIONS.map(({ id, label }) => (
            <button key={id} onClick={() => setMapType(id)}
              className={`px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                mapType === id ? 'bg-[#22c55e] text-white' : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]'
              }`}>
              {label}
            </button>
          ))}
        </GlassCard>

        {/* Place list */}
        {payload && payload.places.length > 0 && (
          <GlassCard className="p-3 max-h-[200px] overflow-y-auto">
            <h3 className="text-[10px] font-medium uppercase tracking-wider text-neutral-500 px-2 mb-1">Places ({payload.places.length})</h3>
            {payload.places.map(n => (
              <button key={n.id} type="button" onClick={() => flyToPlace(n)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${selectedPlace?.id === n.id ? 'bg-white/[0.08] text-white' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200'}`}>
                <span className="truncate">{n.name}</span>
                <span className="w-2 h-2 rounded-full shrink-0 ml-2" style={{ backgroundColor: VULN_COLORS[n.vulnerabilityLevel] }} />
              </button>
            ))}
          </GlassCard>
        )}

      </div>

      {/* â”€â”€â”€ RIGHT FLOATING PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="absolute top-4 right-4 z-20 hidden lg:block w-[300px]">
        <GlassCard className="max-h-[calc(100vh-120px)] overflow-y-auto">

          {/* Tab toggle */}
          <div className="flex items-center border-b border-white/[0.06]">
            <button type="button" onClick={() => setRightPanel('trends')}
              className={`flex-1 text-center text-xs font-medium py-3 transition-colors ${rightPanel === 'trends' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Trends
            </button>
            <button type="button" onClick={() => setRightPanel('inspector')}
              className={`flex-1 text-center text-xs font-medium py-3 transition-colors relative ${rightPanel === 'inspector' ? 'text-[#22c55e] border-b-2 border-[#22c55e]' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Inspector
              {hasInspector && rightPanel !== 'inspector' && <span className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />}
            </button>
          </div>

          {rightPanel === 'trends' ? (
            /* Climate Trends */
            <div className="p-4 space-y-5">
              <h2 className="text-base font-semibold text-white">
                {activeCountryName ? `${activeCountryName} Climate Trends` : 'Climate Vulnerability Trends'}
              </h2>

              <div>
                <h3 className="text-xs font-medium text-neutral-400 mb-2">Global Temperature Anomaly</h3>
                <TempAnomalyChart countryCode={countryCode} />
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-400 mb-2">
                  {activeCountryName ? `${activeCountryName} Sector Vulnerability` : 'Projected Impact by Sector'}
                </h3>
                <SectorImpactChart countryCode={countryCode} />
              </div>

              <div>
                <h3 className="text-xs font-medium text-neutral-400 mb-2">
                  {activeCountryName ? `${activeCountryName} Population Exposure` : 'Population Exposure'}
                </h3>
                <PopExposureChart countryCode={countryCode} />
              </div>
            </div>
          ) : (
            /* â”€â”€ Inspector â”€â”€â”€ */
            <div className="p-4">
              {searchedPlaceLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-5 h-5 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
                  <span className="text-xs text-neutral-400">Fetching live dataâ€¦</span>
                </div>
              ) : searchedPlace ? (
                /* Searched place */
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-white">{searchedPlace.name}</h2>
                      {searchedPlace.countryLongName && (
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {searchedPlace.countryCode ? countryFlag(searchedPlace.countryCode) : ''} {searchedPlace.countryLongName}
                        </p>
                      )}
                    </div>
                    <button onClick={() => { setSearchedPlace(null); setSearchedMarkerPos(null); setRightPanel('trends'); setCountryCode(null); if (searchInputRef.current) searchInputRef.current.value = ''; try { sessionStorage.removeItem('map_searchedPlace'); sessionStorage.removeItem('map_searchedMarkerPos'); sessionStorage.removeItem('map_countryCode'); } catch {} }} className="text-neutral-500 hover:text-white p-0.5 shrink-0">
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-500">{searchedPlace.displayName}</p>

                  {searchedPlace.weather && (
                    <div className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.04] text-xs">
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Temperature</span><span className="font-medium text-white">{searchedPlace.weather.temp.toFixed(1)}Â°C</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Humidity</span><span className="font-medium text-white">{searchedPlace.weather.humidity}%</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Wind</span><span className="font-medium text-white">{searchedPlace.weather.windSpeed} m/s</span></div>
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Conditions</span><span className="font-medium text-white capitalize">{searchedPlace.weather.description}</span></div>
                    </div>
                  )}

                  {searchedPlace.aqi && (
                    <div className="rounded-lg border border-white/[0.06] p-3 text-xs">
                      <span className="text-neutral-500">Air Quality</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg font-bold text-white">AQI {searchedPlace.aqi.overall}</span>
                        <span className="text-neutral-500">PM2.5: {searchedPlace.aqi.pm25.toFixed(1)} Âµg/mÂ³</span>
                      </div>
                    </div>
                  )}

                  {searchedPlace.forecast && (
                    <div className="rounded-lg border border-white/[0.06] p-3 text-xs">
                      <h3 className="text-[10px] font-medium uppercase text-neutral-500 mb-2">7-Day Forecast</h3>
                      <div className="space-y-1">
                        {searchedPlace.forecast.dates.map((d, i) => (
                          <div key={d} className="flex justify-between">
                            <span className="text-neutral-500">{new Date(d).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                            <span><span className="text-red-400 font-medium">{searchedPlace.forecast!.maxTemps[i]?.toFixed(0)}Â°</span><span className="text-neutral-600"> / </span><span className="text-blue-400">{searchedPlace.forecast!.minTemps[i]?.toFixed(0)}Â°</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}



                  {geminiReport && (
                    <div className="rounded-xl border border-purple-500/20 p-3 bg-purple-500/5">
                      <h3 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>Gemini Analysis
                      </h3>
                      <div className="text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">{geminiReport}</div>
                    </div>
                  )}



                  {/* Save City CTA */}
                  {session?.user && !citySaved && (
                    <button onClick={saveCity} disabled={savingCity}
                      className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold border border-[#22c55e]/40 text-[#22c55e] rounded-xl hover:bg-[#22c55e]/10 transition-colors disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">add_location_alt</span>
                      {savingCity ? 'Saving…' : `+ Add ${searchedPlace.name} to My Places`}
                    </button>
                  )}
                  {citySaved && <p className="text-[11px] text-[#22c55e] text-center">✓ Place saved to your city</p>}
                </div>
              ) : inspectorPlace ? (
                /* Place inspector with live vulnerability */
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-white">{inspectorPlace.name}</h2>

                  {(() => {
                    const lvl = liveVuln?.vulnerability.level ?? inspectorPlace.vulnerabilityLevel;
                    const scr = liveVuln?.vulnerability.score ?? inspectorPlace.vulnerabilityScore;
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5" style={{ backgroundColor: `${VULN_COLORS[lvl]}1a`, border: `1px solid ${VULN_COLORS[lvl]}4d`, color: VULN_COLORS[lvl] }}>
                          {lvl} Â· {scr}
                        </span>
                        {liveVuln && <span className="text-[9px] font-medium text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/20 rounded px-1.5 py-0.5 flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-[#22c55e] animate-pulse" />LIVE</span>}
                        {liveVulnLoading && <div className="w-3 h-3 border border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />}
                      </div>
                    );
                  })()}

                  {liveVuln?.live && (
                    <div className="rounded-lg border border-[#22c55e]/15 bg-[#22c55e]/5 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-[#22c55e] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>thermostat</span>Live
                        </span>
                        <span className="text-[9px] text-neutral-500">{new Date(liveVuln.live.fetchedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        {liveVuln.live.temp != null && <div><span className="text-neutral-500">Temp</span><span className="font-semibold text-white ml-1">{liveVuln.live.temp.toFixed(1)}Â°C</span></div>}
                        {liveVuln.live.apparentTemp != null && <div><span className="text-neutral-500">Feels</span><span className="font-medium text-white ml-1">{liveVuln.live.apparentTemp.toFixed(1)}Â°C</span></div>}
                        {liveVuln.live.humidity != null && <div><span className="text-neutral-500">Humidity</span><span className="font-medium text-white ml-1">{liveVuln.live.humidity}%</span></div>}
                        {liveVuln.live.windSpeed != null && <div><span className="text-neutral-500">Wind</span><span className="font-medium text-white ml-1">{liveVuln.live.windSpeed} km/h</span></div>}
                        {liveVuln.live.todayMax != null && <div><span className="text-neutral-500">Max</span><span className="font-semibold text-orange-400 ml-1">{liveVuln.live.todayMax.toFixed(1)}Â°C</span></div>}
                        {liveVuln.live.todayMin != null && <div><span className="text-neutral-500">Min</span><span className="font-medium text-blue-400 ml-1">{liveVuln.live.todayMin.toFixed(1)}Â°C</span></div>}
                      </div>
                    </div>
                  )}

                  {liveVuln?.vulnerability.factors && liveVuln.vulnerability.factors.length > 0 && (
                    <div className="rounded-lg border border-white/[0.06] p-3">
                      <h3 className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 mb-2">Risk Factors</h3>
                      <div className="space-y-2">
                        {liveVuln.vulnerability.factors.map(f => {
                          const pct = Math.round((f.points / f.maxPoints) * 100);
                          const bc = pct >= 80 ? '#ef4444' : pct >= 60 ? '#f97316' : pct >= 40 ? '#eab308' : '#22c55e';
                          return (
                            <div key={f.name}>
                              <div className="flex justify-between text-[10px] mb-0.5"><span className="text-neutral-400">{f.name}</span><span className="text-neutral-600">{f.points}/{f.maxPoints}</span></div>
                              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bc }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border border-white/[0.06] divide-y divide-white/[0.04] text-xs">
                    <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Population</span><span className="font-medium text-white">{inspectorPlace.population?.toLocaleString() ?? 'â€”'}</span></div>
                    {(liveVuln?.stored.treeCanopyPct ?? inspectorPlace.treeCanopyPct) != null && (
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Tree canopy</span><span className="font-medium text-[#22c55e]">{(liveVuln?.stored.treeCanopyPct ?? inspectorPlace.treeCanopyPct)!.toFixed(0)}%</span></div>
                    )}
                    {(liveVuln?.stored.imperviousSurfacePct ?? inspectorPlace.imperviousSurfacePct) != null && (
                      <div className="flex justify-between px-3 py-2"><span className="text-neutral-500">Impervious surface</span><span className="font-medium text-white">{(liveVuln?.stored.imperviousSurfacePct ?? inspectorPlace.imperviousSurfacePct)!.toFixed(0)}%</span></div>
                    )}
                  </div>

                  {(() => {
                    const s = liveVuln?.vulnerability.score ?? inspectorPlace.vulnerabilityScore;
                    const l = liveVuln?.vulnerability.level ?? inspectorPlace.vulnerabilityLevel;
                    return s > 0 ? (
                      <div className="p-3 rounded-lg border border-white/[0.06]">
                        <div className="flex justify-between text-[10px] text-neutral-500 mb-1"><span>Score</span><span>{s}/100</span></div>
                        <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${s}%`, backgroundColor: VULN_COLORS[l] }} /></div>
                      </div>
                    ) : null;
                  })()}

                  </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="material-symbols-outlined text-2xl text-neutral-600 mb-2">touch_app</span>
                  <p className="text-xs text-neutral-500">Select a place or search globally.</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>

      {/* â”€â”€â”€ MAP CONTROLS (bottom-right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2 items-end">
        <GlassCard className="flex flex-col overflow-hidden">

          <button type="button" onClick={zoomIn} className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <div className="h-px bg-white/[0.06]" />
          <button type="button" onClick={zoomOut} className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
        </GlassCard>
      </div>

      {/* â”€â”€â”€ MOBILE BOTTOM BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="absolute bottom-0 left-0 right-0 z-30 lg:hidden">
        <div className="flex gap-2 p-2 justify-center">
          <button onClick={() => setMobilePanel(mobilePanel === 'stats' ? 'none' : 'stats')}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${mobilePanel === 'stats' ? 'bg-[#22c55e] text-white' : 'bg-[#111113]/80 backdrop-blur-xl border border-white/[0.06] text-neutral-300'}`}>
            Stats
          </button>
          <button onClick={() => setMobilePanel(mobilePanel === 'inspector' ? 'none' : 'inspector')}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${mobilePanel === 'inspector' ? 'bg-[#22c55e] text-white' : 'bg-[#111113]/80 backdrop-blur-xl border border-white/[0.06] text-neutral-300'}`}>
            Inspector
          </button>
        </div>

        {mobilePanel === 'stats' && (
          <GlassCard className="mx-2 mb-2 p-4 max-h-[50vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>{statsLoading ? <div className="h-6 w-8 mx-auto bg-white/[0.06] rounded animate-pulse" /> : <div className="text-xl font-bold text-white">{displayStats.extremeHeatZones ?? '—'}</div>}<div className="text-[10px] text-neutral-500">Heat Zones</div></div>
              <div>{statsLoading ? <div className="h-6 w-8 mx-auto bg-white/[0.06] rounded animate-pulse" /> : <div className="text-xl font-bold text-white">{displayStats.highRisk ?? '—'}</div>}<div className="text-[10px] text-neutral-500">High Risk</div></div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(l => (
                <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: VULN_COLORS[l] }} /><span className="text-[10px] text-neutral-400 capitalize">{l.toLowerCase()}</span></div>
              ))}
            </div>
            {canEdit && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/dashboard/scenarios/new" className="flex items-center justify-center gap-1 h-9 text-xs font-medium bg-[#22c55e] text-white rounded-lg">
                  Build Scenario
                </Link>
              </div>
            )}
          </GlassCard>
        )}

        {mobilePanel === 'inspector' && (
          <GlassCard className="mx-2 mb-2 p-4 max-h-[50vh] overflow-y-auto">
            {searchedPlace ? (
              <div className="space-y-2">
                <div className="flex justify-between"><h2 className="text-sm font-semibold text-white">{searchedPlace.name}</h2><button onClick={() => { setSearchedPlace(null); setSearchedMarkerPos(null); setCountryCode(null); if (searchInputRef.current) searchInputRef.current.value = ''; }} className="text-neutral-500"><span className="material-symbols-outlined text-base">close</span></button></div>
                {searchedPlace.countryLongName && <p className="text-[10px] text-neutral-500">{searchedPlace.countryCode ? countryFlag(searchedPlace.countryCode) : ''} {searchedPlace.countryLongName}</p>}
                {searchedPlace.weather && <div className="text-xs text-neutral-300">{searchedPlace.weather.temp.toFixed(1)}°C · {searchedPlace.weather.description} · {searchedPlace.weather.humidity}% humidity</div>}
                {searchedPlace.aqi && <div className="text-xs text-neutral-300">AQI {searchedPlace.aqi.overall} · PM2.5: {searchedPlace.aqi.pm25.toFixed(1)}</div>}
                <button onClick={runGeminiAnalysis} disabled={geminiLoading} className="w-full h-9 text-xs font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50">
                  {geminiLoading ? 'Analyzing…' : 'AI Heat Analysis'}
                </button>
                {geminiReport && <div className="text-[11px] text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto border border-purple-500/20 rounded-lg p-3">{geminiReport}</div>}
                {session?.user && !citySaved && (
                  <button onClick={saveCity} disabled={savingCity} className="w-full h-9 text-xs font-medium border border-[#22c55e]/40 text-[#22c55e] rounded-lg disabled:opacity-50">
                    {savingCity ? 'Saving…' : `+ Add ${searchedPlace.name} to My Places`}
                  </button>
                )}
                {citySaved && <div className="text-xs text-[#22c55e] text-center">✓ Place saved to your city</div>}
              </div>
            ) : inspectorPlace ? (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-white">{inspectorPlace.name}</h2>
                <span className="text-[10px] font-semibold uppercase rounded px-2 py-0.5 inline-block" style={{ backgroundColor: `${VULN_COLORS[inspectorPlace.vulnerabilityLevel]}1a`, color: VULN_COLORS[inspectorPlace.vulnerabilityLevel] }}>{inspectorPlace.vulnerabilityLevel} Â· {inspectorPlace.vulnerabilityScore}</span>
                {liveVuln?.live && <div className="text-xs text-neutral-300">{liveVuln.live.temp?.toFixed(1)}Â°C live Â· Humidity {liveVuln.live.humidity}%</div>}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 text-center py-4">Select a place on the map or search.</p>
            )}
          </GlassCard>
        )}
      </div>

      {/* ─── SAVE SUCCESS POPUP ─────────────────────────────────────────────── */}
      {showSaveSuccess && searchedPlace && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
          <GlassCard className="p-6 max-w-sm w-full mx-4 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 grid place-items-center">
              <span className="material-symbols-outlined text-[#22c55e] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{searchedPlace.name} saved!</h3>
              <p className="text-sm text-neutral-400 mt-1">Added to your data hub. Continue in Scenarios or stay on the Map.</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/scenarios"
                className="flex-1 h-10 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-[#22c55e] hover:bg-[#16a34a] rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-sm">science</span>
                Go to Scenarios
              </Link>
              <button
                onClick={() => setShowSaveSuccess(false)}
                className="flex-1 h-10 text-xs font-semibold text-neutral-300 border border-white/10 hover:border-white/20 rounded-xl transition-colors"
              >
                Stay on Map
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
