'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addPlaceAction, addHeatMeasurementAction, updatePlaceAction, deletePlaceAction } from '@/lib/actions';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface CityData {
  id: string; name: string; state: string | null; country: string;
  population: number | null; areaSqkm: number | null;
  lat: number | null; lng: number | null; timezone: string | null;
  currency: string; updatedAt: string;
}
type HeatMeasurement = {
  id: string; date: string; avgTemp: number; maxTemp: number | null;
  minTemp: number | null; treeCanopyPct: number | null;
  imperviousSurfacePct: number | null; dataSource: string;
};
interface PlaceData {
  id: string; name: string; population: number | null; areaSqkm: number | null;
  medianIncome: number | null; pctElderly: number | null; pctChildren: number | null;
  vulnerabilityScore: number | null; vulnerabilityLevel: string | null;
  boundary: boolean;
  heatMeasurements: HeatMeasurement[];
  interventions: { id: string; name: string; type: string; status: string; estimatedTempReductionC: number | null }[];
}
interface StatsData {
  totalPlaces: number; totalMeasurements: number; activeInterventions: number;
  completedInterventions: number; totalProjectedReduction: number;
}
interface CompletenessItem { placeId: string; placeName: string; checks: Record<string, boolean>; pct: number }
interface CompletenessData { items: CompletenessItem[]; overall: number }
interface ScenarioData { id: string; name: string; status: string; interventionCount: number; createdAt: string }

interface Props {
  city: CityData; places: PlaceData[]; stats: StatsData;
  completeness: CompletenessData; teamCount: number;
  scenarios: ScenarioData[]; userId: string; cityId: string;
}

// ─── Vulnerability colour map ────────────────────────────────────────────────
const VULN: Record<string, { color: string; bg: string; grad: string; border: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', grad: 'linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(239,68,68,0.03) 30%, var(--bg-surface) 60%)', border: 'rgba(239,68,68,0.25)' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', grad: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0.03) 30%, var(--bg-surface) 60%)', border: 'rgba(249,115,22,0.25)' },
  MODERATE: { color: '#eab308', bg: 'rgba(234,179,8,0.10)',  grad: 'linear-gradient(135deg, rgba(234,179,8,0.10) 0%, rgba(234,179,8,0.03) 30%, var(--bg-surface) 60%)', border: 'rgba(234,179,8,0.25)' },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  grad: 'linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 30%, var(--bg-surface) 60%)', border: 'rgba(34,197,94,0.25)' },
  _:        { color: '#818cf8', bg: 'rgba(99,102,241,0.08)', grad: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.02) 30%, var(--bg-surface) 60%)', border: 'rgba(99,102,241,0.20)' },
};
function vl(level: string | null) { return VULN[level ?? '_'] ?? VULN['_']; }

// ─── Shared input class ───────────────────────────────────────────────────────
const IC = 'px-2.5 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[10px] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[rgba(34,197,94,0.50)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.08)] w-full transition-all';

// ─── Search Hook ───────────────────────────────────────────────────────────────
function useNominatimSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  useEffect(() => {
    if (query.length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`);
        if (res.ok) setResults(await res.json());
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [query]);
  return { query, setQuery, results, setResults };
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = [...data].slice(0, 8).reverse();
  if (pts.length < 2) return null;
  const lo = Math.min(...pts), hi = Math.max(...pts), r = (hi - lo) || 1;
  const W = 80, H = 32;
  const d = pts.map((v, i) => {
    const x = ((i / (pts.length - 1)) * (W - 6) + 3).toFixed(1);
    const y = (H - 5 - ((v - lo) / r) * (H - 10)).toFixed(1);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const lx = (W - 3).toFixed(1);
  const ly = (H - 5 - ((pts.at(-1) ?? 0 - lo) / r) * (H - 10)).toFixed(1);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Circular Progress ─────────────────────────────────────────────────────────
function CircularProgress({ percentage }: { percentage: number }) {
  const color = percentage > 80 ? '#22c55e' : percentage >= 50 ? '#f97316' : '#ef4444';
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-[44px] h-[44px] flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
      </svg>
      <span className="absolute text-[12px] font-bold" style={{ color: 'var(--text-primary)' }}>{percentage}%</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyDataClient(props: Props) {
  const { city, places, stats, completeness, scenarios, cityId } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // UI state
  const [addDataFor,    setAddDataFor]    = useState<string | null>(null);
  const [showAddPlace,  setShowAddPlace]  = useState(false);
  const [error,         setError]         = useState('');
  const [toast,         setToast]         = useState('');
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState<string | null>(null);
  const [addPlaceTab, setAddPlaceTab] = useState<'search' | 'manual'>('search');
  
  // Search state
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, setResults: setSearchResults } = useNominatimSearch();
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // Toast helper
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  // Escape key to close popup
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (deleteConfirmId) { setDeleteConfirmId(null); return; }
        if (selectedPlace) { setSelectedPlace(null); return; }
        if (showAddPlace) setShowAddPlace(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteConfirmId, selectedPlace, showAddPlace]);

  // Scroll state
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyHeader(!entry.isIntersecting);
      },
      { rootMargin: '-1px 0px 0px 0px', threshold: 0 }
    );
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Search & filter
  const [query,       setQuery]       = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');

  // ── Computed ──────────────────────────────────────────────────────────────
  const latestTemps = places.flatMap(p => p.heatMeasurements.slice(0, 1)).map(m => m.avgTemp);
  const avgTemp = latestTemps.length > 0 ? latestTemps.reduce((a, b) => a + b) / latestTemps.length : null;
  const vulnerablePop = places
    .filter(p => ['CRITICAL', 'HIGH'].includes(p.vulnerabilityLevel ?? ''))
    .reduce((s, p) => s + (p.population ?? 0), 0);
  const activePlaces = places.filter(p => p.heatMeasurements.length > 0).length;

  const n = completeness.items.length;
  const tempLayerPct = n ? Math.round(completeness.items.filter(i => i.checks.hasHeatData).length   / n * 100) : 0;
  const canopyLayPct = n ? Math.round(completeness.items.filter(i => i.checks.hasTreeCanopy).length / n * 100) : 0;
  const boundaryPct  = n ? Math.round(completeness.items.filter(i => i.checks.hasBoundary).length   / n * 100) : 0;

  const levelCounts = (['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).reduce<Record<string, number>>((acc, l) => {
    acc[l] = places.filter(p => p.vulnerabilityLevel === l).length;
    return acc;
  }, {});

  const filtered = places.filter(p => {
    const mQ = p.name.toLowerCase().includes(query.toLowerCase());
    const mL = filterLevel === 'ALL' || p.vulnerabilityLevel === filterLevel;
    return mQ && mL;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleAddPlace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const fd = new FormData(e.currentTarget);
    try {
      if (lat && lng) {
        const res = await fetch('/api/cities/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fd.get('name'), lat, lng })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Failed to add place');
        }
        const data = await res.json();
        // Close modal immediately
        setShowAddPlace(false);
        setSearchQuery(''); setLat(null); setLng(null); setAddPlaceTab('search');
        showToast('Place added — fetching climate data...');
        await updatePlaceAction(data.placeId, {
          population:    fd.get('population')   ? Number(fd.get('population'))   : undefined,
          areaSqkm:      fd.get('areaSqkm')     ? Number(fd.get('areaSqkm'))     : undefined,
          medianIncome:  fd.get('medianIncome') ? Number(fd.get('medianIncome')) : undefined,
          pctElderly:    fd.get('pctElderly')   ? Number(fd.get('pctElderly'))   : undefined,
          pctChildren:   fd.get('pctChildren')  ? Number(fd.get('pctChildren'))  : undefined,
        });
        setTimeout(() => startTransition(() => router.refresh()), 3000);
      } else {
        await addPlaceAction({
          cityId,
          name:          fd.get('name') as string,
          population:    fd.get('population')   ? Number(fd.get('population'))   : undefined,
          areaSqkm:      fd.get('areaSqkm')     ? Number(fd.get('areaSqkm'))     : undefined,
          medianIncome:  fd.get('medianIncome') ? Number(fd.get('medianIncome')) : undefined,
          pctElderly:    fd.get('pctElderly')   ? Number(fd.get('pctElderly'))   : undefined,
          pctChildren:   fd.get('pctChildren')  ? Number(fd.get('pctChildren'))  : undefined,
        });
        setShowAddPlace(false);
        setSearchQuery(''); setLat(null); setLng(null); setAddPlaceTab('search');
        showToast('Place added successfully');
        startTransition(() => router.refresh());
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add place'); }
  }

  async function handleAddMeasurement(e: React.FormEvent<HTMLFormElement>, placeId: string) {
    e.preventDefault(); setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await addHeatMeasurementAction({
        placeId,
        measurementDate:      new Date(fd.get('date') as string).toISOString(),
        avgTempCelsius:       Number(fd.get('avgTemp')),
        maxTempCelsius:       Number(fd.get('maxTemp')),
        minTempCelsius:       fd.get('minTemp')              ? Number(fd.get('minTemp'))              : undefined,
        treeCanopyPct:        fd.get('treeCanopyPct')        ? Number(fd.get('treeCanopyPct'))        : undefined,
        imperviousSurfacePct: fd.get('imperviousSurfacePct') ? Number(fd.get('imperviousSurfacePct')) : undefined,
        dataSource:           (fd.get('dataSource') as string) || undefined,
      });
      setAddDataFor(null);
      startTransition(() => router.refresh());
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add measurement'); }
  }

  async function handleDeletePlace(placeId: string) {
    setIsDeleting(true);
    try {
      const result = await deletePlaceAction(placeId, cityId);
      if (result.success) {
        setDeleteConfirmId(null);
        setSelectedPlace(null);
        showToast('Place deleted successfully');
        startTransition(() => router.refresh());
      } else {
        setError(result.error ?? 'Failed to delete place');
      }
    } catch {
      setError('Failed to delete place');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20 relative" style={{
      background: '#000000',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Corner flash animations */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '400px', height: '400px',
        background: 'radial-gradient(circle at top left, rgba(34,197,94,0.12) 0%, transparent 70%)',
        animation: 'cornerPulse 4s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: '350px', height: '350px',
        background: 'radial-gradient(circle at bottom right, rgba(59,130,246,0.08) 0%, transparent 70%)',
        animation: 'cornerPulse 5s ease-in-out infinite 1.5s',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '40%', right: '10%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle at center, rgba(168,85,247,0.06) 0%, transparent 70%)',
        animation: 'cornerPulse 6s ease-in-out infinite 3s',
        pointerEvents: 'none', zIndex: 0,
      }} />
      {/* Main content above corner flashes */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── Sticky Header ── */}
      <div 
        className={`fixed top-[60px] left-0 right-0 z-40 h-[40px] bg-[var(--bg-base)]/80 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-6 transition-opacity duration-300 pointer-events-none md:pl-[280px] ${showStickyHeader ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-xs font-semibold text-[var(--text-primary)]">Heat Intelligence Center</span>
        <span className="text-xs text-[var(--text-tertiary)] mx-2">·</span>
        <span className="text-xs text-[var(--text-secondary)]">{city.name}</span>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm bg-[var(--critical)]/10 border border-[var(--critical)]/40 text-[var(--critical)] rounded-lg">
          <span className="material-symbols-outlined text-base">error</span>{error}
        </div>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div 
        ref={headerRef}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 w-full pb-[24px] border-b border-[var(--border)] mb-[24px]"
        style={{ background: 'linear-gradient(to bottom, var(--bg-surface) 0%, transparent 100%)' }}
      >
        <div className="flex flex-col">
          <h1 className="text-[32px] font-bold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">Heat Intelligence Center</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowAddPlace(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green-500)] text-white text-xs font-semibold transition-all hover:bg-[var(--green-400)] shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:shadow-[0_0_28px_rgba(34,197,94,0.40)]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Place
          </button>
        </div>
      </div>

      {/* ── SCENARIO QUICK START BANNER ─────────────────────────────────── */}
      {places.length > 0 && scenarios.length === 0 && (
        <div className="flex items-center justify-between p-5 rounded-[16px] border border-[rgba(34,197,94,0.25)] mb-4"
             style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 50%, rgba(59,130,246,0.08) 100%)' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#22c55e]/20 flex items-center justify-center border border-[#22c55e]/30">
              <span className="material-symbols-outlined text-[24px] text-[#22c55e]">science</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Ready to build your first scenario?</h3>
              <p className="text-[12px] text-[var(--text-secondary)]">Select a place and let Gemini generate a complete heat mitigation plan with PDF report.</p>
            </div>
          </div>
          <Link href="/dashboard/scenarios" className="shrink-0 px-5 py-2.5 bg-[#22c55e] text-white text-[13px] font-bold rounded-[8px] hover:bg-[#16a34a] shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
            Build Scenario →
          </Link>
        </div>
      )}

      {/* ── KPI ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Total Places',    val: String(stats.totalPlaces),                                                     accent: '#3b82f6', valColor: '#60a5fa', context: 'monitored locations', bgGlow: 'rgba(59,130,246,0.06)' },
          { label: 'Avg Temperature', val: avgTemp != null ? `${avgTemp.toFixed(1)}°C` : '—',                  accent: '#f97316', valColor: '#fb923c', context: 'latest readings average', bgGlow: 'rgba(249,115,22,0.06)' },
          { label: 'Vulnerable Pop',  val: vulnerablePop > 0 ? `${(vulnerablePop / 1000).toFixed(0)}k` : '—',      accent: '#ef4444', valColor: '#f87171', context: 'in HIGH/CRITICAL zones', bgGlow: 'rgba(239,68,68,0.06)' },
          { label: 'Monitored Zones', val: `${activePlaces} / ${stats.totalPlaces}`,                                   accent: '#22c55e', valColor: '#4ade80', context: 'zones with active data', bgGlow: 'rgba(34,197,94,0.06)' },
        ] as const).map(({ label, val, accent, valColor, context, bgGlow }) => (
          <div key={label} className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] rounded-[16px] p-[20px] flex flex-col relative overflow-hidden group" style={{ borderTop: `2px solid ${accent}`, background: `linear-gradient(180deg, ${bgGlow} 0%, transparent 40%), var(--bg-surface)` }}>
            <div className="flex items-center gap-[6px] relative z-10">
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-[0.12em] font-semibold">{label}</span>
            </div>
            
            <span className="text-[36px] font-extrabold tracking-[-0.04em] leading-none mt-[12px] tabular-nums relative z-10" style={{ color: valColor }}>
              {val}
            </span>
            
            <span className="text-[11px] text-[var(--text-tertiary)] mt-1 relative z-10">
              {context}
            </span>
          </div>
        ))}
      </div>

      {/* ── SEARCH + FILTER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        {/* Search input */}
        <div className="relative flex-1 group">
          <span className="absolute left-[12px] top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--text-tertiary)] text-[16px] leading-none pointer-events-none transition-colors group-focus-within:text-[var(--green-400)]">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search places..."
            className="w-full h-[44px] pl-[36px] pr-[100px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-[12px] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] placeholder:text-[13px] focus:outline-none focus:border-[var(--border-strong)] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.08)] transition-all duration-200"
          />
          
          <div className="absolute right-[12px] top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && <span className="text-[11px] text-[var(--text-tertiary)]">{filtered.length} results</span>}
            {query && (
              <button onClick={() => setQuery('')} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center bg-[var(--bg-elevated)] rounded-full w-5 h-5">
                <span className="material-symbols-outlined text-[12px] leading-none">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap items-center">
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(lvl => {
            const active = filterLevel === lvl;
            const c = VULN[lvl] ?? VULN['_'];
            const count = lvl !== 'ALL' ? (levelCounts[lvl] ?? 0) : places.length;
            const isEmpty = count === 0;

            if (lvl === 'ALL') {
              return (
                <button
                  key={lvl}
                  onClick={() => setFilterLevel(lvl)}
                  className={`flex items-center gap-1.5 px-3 h-[32px] text-[11px] font-semibold rounded-[8px] uppercase tracking-wide border transition-all ${active ? 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)]' : 'bg-transparent border-[rgba(99,102,241,0.30)] text-[rgba(99,102,241,0.70)] hover:bg-[rgba(99,102,241,0.08)] hover:border-[rgba(99,102,241,0.60)]'}`}
                >
                  All
                  <span className="inline-flex items-center justify-center bg-[var(--bg-elevated)] text-[9px] px-[5px] py-[1px] rounded-full opacity-60">
                    {count}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                disabled={isEmpty}
                className={`flex items-center gap-1.5 px-3 h-[32px] text-[11px] font-semibold rounded-[8px] uppercase tracking-wide border transition-all ${isEmpty ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-100 hover:bg-[var(--bg-elevated)]'}`}
                style={
                  active && !isEmpty
                    ? { backgroundColor: c.bg, borderColor: c.color, color: c.color }
                    : { backgroundColor: 'transparent', borderColor: c.border, color: `${c.color}8C` }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                {lvl}
                <span 
                  className="inline-flex items-center justify-center text-[9px] px-[5px] py-[1px] rounded-full"
                  style={{ backgroundColor: `${c.color}1a`, color: active ? c.color : 'inherit' }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">

        {/* ── Places table (left 8) ── */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Result count line */}
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-[12px] mb-[4px]">
            <span className="text-xs text-[var(--text-tertiary)]">
              Showing <span className="text-[var(--text-primary)] font-semibold">{filtered.length}</span> of {places.length} places
              {query && <span className="ml-1">matching &ldquo;<span className="text-[var(--text-primary)]">{query}</span>&rdquo;</span>}
            </span>
            {(query || filterLevel !== 'ALL') && (
              <button onClick={() => { setQuery(''); setFilterLevel('ALL'); }} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline transition-colors">
                Clear filters
              </button>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className={`flex flex-col items-center justify-center gap-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-[16px] ${places.length === 0 ? 'py-24' : 'py-12'}`}>
              <div className="w-[64px] h-[64px] rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center mb-[20px] shadow-[0_0_30px_rgba(255,255,255,0.03)] relative">
                <div className="absolute inset-0 rounded-full border border-[var(--border-strong)] animate-ping opacity-20"></div>
                <span className="material-symbols-outlined text-[48px] text-[var(--text-tertiary)]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {places.length === 0 ? 'add_location_alt' : 'search_off'}
                </span>
              </div>
              <div className="text-center px-4">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                  {places.length === 0 ? 'No places yet' : 'No places match'}
                </h3>
                <p className="text-[13px] text-[var(--text-tertiary)] max-w-[300px] mx-auto leading-relaxed">
                  {places.length === 0 
                    ? 'Add your first monitored location to start tracking heat vulnerability and building cooling scenarios.' 
                    : <span>We couldn&apos;t find any places matching <span className="text-[var(--text-primary)]">&ldquo;{query}&rdquo;</span>. Try a different name or clear the filter.</span>
                  }
                </p>
                {places.length === 0 && (
                  <button onClick={() => setShowAddPlace(true)} className="mt-4 px-5 py-2.5 bg-[var(--green-500)] text-white rounded-[10px] text-[13px] font-semibold hover:bg-[var(--green-400)] transition-colors shadow-[0_0_20px_rgba(34,197,94,0.25)]">
                    Add First Place
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Places table */}
          {filtered.length > 0 && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-[16px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                    {['Name', 'Vulnerability', 'Avg Temp', 'Canopy', 'Population', 'Actions'].map((h, i) => (
                      <th key={h} className={`py-3 px-4 text-[9px] uppercase tracking-widest font-semibold text-[var(--text-tertiary)] ${i === 0 ? 'text-left' : i < 5 ? 'text-right' : 'text-center'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const v = vl(p.vulnerabilityLevel);
                    const latest = p.heatMeasurements[0];
                    const canopy = latest?.treeCanopyPct;
                    const isDeleteRow = deleteConfirmId === p.id;
                    return (
                      <>
                        <tr
                          key={p.id}
                          onClick={() => !isDeleteRow && setSelectedPlace(p)}
                          className={`border-b border-[var(--border)]/50 cursor-pointer transition-colors hover:bg-[var(--bg-elevated)] ${i % 2 === 0 ? '' : 'bg-[rgba(255,255,255,0.01)]'} ${isDeleteRow ? 'bg-[rgba(239,68,68,0.05)]' : ''}`}
                        >
                          <td className="py-3 px-4">
                            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{p.name}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {p.vulnerabilityLevel ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: v.color, backgroundColor: v.bg }}>
                                {p.vulnerabilityLevel}
                              </span>
                            ) : <span className="text-[var(--text-tertiary)] text-xs">—</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[13px] font-semibold tabular-nums" style={{ color: latest ? v.color : 'var(--text-tertiary)' }}>
                              {latest ? `${latest.avgTemp.toFixed(1)}°C` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-[12px] tabular-nums ${canopy != null ? (canopy < 15 ? 'text-[#ef4444]' : canopy <= 30 ? 'text-[#f97316]' : 'text-[#22c55e]') : 'text-[var(--text-tertiary)]'}`}>
                              {canopy != null ? `${canopy.toFixed(0)}%` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-[12px] text-[var(--text-secondary)] tabular-nums">
                              {p.population != null ? `${(p.population / 1000).toFixed(0)}k` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                              <Link href={`/dashboard/map?placeId=${p.id}&placeName=${encodeURIComponent(p.name)}`} title="View on Map"
                                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[#06b6d4] hover:bg-[rgba(6,182,212,0.1)] transition-colors">
                                <span className="material-symbols-outlined text-[16px]">map</span>
                              </Link>
                              <button
                                title="Build Scenario"
                                onClick={() => { setScenarioLoading(p.id); router.push(`/dashboard/scenarios/new?placeId=${p.id}`); }}
                                disabled={scenarioLoading === p.id}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[#22c55e] hover:bg-[rgba(34,197,94,0.1)] transition-colors disabled:opacity-50"
                              >
                                {scenarioLoading === p.id
                                  ? <span className="w-3 h-3 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
                                  : <span className="material-symbols-outlined text-[16px]">science</span>}
                              </button>
                              <button
                                title="Delete place"
                                onClick={() => setDeleteConfirmId(deleteConfirmId === p.id ? null : p.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-tertiary)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isDeleteRow && (
                          <tr key={`${p.id}-del`} className="bg-[rgba(239,68,68,0.06)] border-b border-[var(--border)]/50">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[12px] text-[#f87171]">
                                  Delete <strong>{p.name}</strong>? All heat measurements and interventions will be permanently removed.
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-[11px] border border-[var(--border)] rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                    Cancel
                                  </button>
                                  <button onClick={() => handleDeletePlace(p.id)} disabled={isDeleting}
                                    className="px-3 py-1.5 text-[11px] bg-[#ef4444] text-white rounded-[8px] hover:bg-[#dc2626] disabled:opacity-50 transition-colors font-semibold">
                                    {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Sidebar (right 4) ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Scenario Overview */}
          <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#22c55e] rounded-[16px] p-5 flex flex-col gap-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#22c55e] flex items-center gap-1.5 border-l-2 border-[#22c55e] pl-2">
              <span className="material-symbols-outlined text-[14px]">science</span>
              Scenario Overview
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 flex flex-col gap-1 border border-[rgba(34,197,94,0.15)] shadow-[0_0_16px_rgba(34,197,94,0.08)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Active</span>
                <span className="text-[24px] font-extrabold text-[#22c55e]">{stats.activeInterventions}</span>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-xl p-4 flex flex-col gap-1 border border-[var(--border)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium">Completed</span>
                <span className="text-[24px] font-extrabold text-[var(--text-primary)]">{stats.completedInterventions}</span>
              </div>
              {stats.totalProjectedReduction > 0 && (
                <div className="col-span-2 bg-[var(--bg-elevated)] rounded-xl p-5 flex flex-col gap-1 border border-[rgba(34,197,94,0.15)] shadow-[0_0_16px_rgba(34,197,94,0.08)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[100px] h-[100px] bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.15),transparent)] pointer-events-none" />
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-medium relative z-10">Projected cooling</span>
                  <span className="text-[36px] font-extrabold tracking-[-0.04em] leading-none my-1 relative z-10 text-[#22c55e]">
                    -{stats.totalProjectedReduction.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] relative z-10">avg. across active scenarios</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Vulnerability Distribution */}
          {places.filter(p => p.vulnerabilityLevel).length >= 2 && (
            <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#f97316] rounded-[16px] p-5 flex flex-col gap-4">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#f97316] flex items-center gap-1.5 border-l-2 border-[#f97316] pl-2">
                <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                Vulnerability Distribution
              </h2>
              
              <div className="flex w-full h-[24px] rounded-full overflow-hidden mt-2">
                {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(lvl => {
                  const count = levelCounts[lvl] || 0;
                  if (count === 0) return null;
                  const pct = (count / places.length) * 100;
                  const color = VULN[lvl].color;
                  return (
                    <div 
                      key={lvl} 
                      style={{ width: `${pct}%`, backgroundColor: color }} 
                      className="h-full border-r border-[var(--bg-surface)] last:border-0 group relative cursor-help"
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] px-2 py-1 rounded shadow-lg z-50 text-[var(--text-primary)]">
                        {count} places at {lvl} risk
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-wrap gap-3 mt-1">
                {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(lvl => {
                  const count = levelCounts[lvl] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={lvl} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: VULN[lvl].color }} />
                      <span className="text-[10px] text-[var(--text-secondary)]">{lvl} <strong className="text-[var(--text-primary)]">{count}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Data completeness */}
          <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#3b82f6] rounded-[16px] p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#3b82f6] flex items-center gap-1.5 border-l-2 border-[#3b82f6] pl-2">
                <span className="material-symbols-outlined text-[14px]">analytics</span>
                Data Completeness
              </h2>
              <CircularProgress percentage={completeness.overall} />
            </div>
            <div className="flex flex-col gap-4 mt-2">
              {[
                { label: 'Temp Layer',    pct: tempLayerPct,         color: '#22c55e', icon: 'thermostat', grad: 'linear-gradient(90deg, #22c55e, #4ade80)' },
                { label: 'Tree Canopy',   pct: canopyLayPct,         color: '#16a34a', icon: 'park', grad: 'linear-gradient(90deg, #16a34a, #22c55e)' },
                { label: 'Boundaries',    pct: boundaryPct,          color: '#f97316', icon: 'crop_free', grad: 'linear-gradient(90deg, #f97316, #fb923c)' },
                { label: 'Overall Index', pct: completeness.overall, color: '#3b82f6', icon: 'analytics', grad: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
              ].map(({ label, pct, color, icon, grad }) => (
                <div key={label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                      <span className="material-symbols-outlined text-[12px]" style={{ color }}>{icon}</span>
                      {label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="h-[8px] bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-[1500ms] ease-out"
                      style={{ width: `${pct}%`, background: grad }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          
        </div>
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-[var(--bg-elevated)] border border-[rgba(34,197,94,0.30)] rounded-[12px] text-[13px] text-[#22c55e] font-medium shadow-2xl animate-fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {toast}
        </div>
      )}

      {/* ── PLACE DETAIL POPUP ── */}
      {selectedPlace && (() => {
        const p = selectedPlace;
        const v = vl(p.vulnerabilityLevel);
        const latest = p.heatMeasurements[0];
        const temps = p.heatMeasurements.map(m => m.avgTemp);
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlace(null)}>
            <div
              style={{ width: 'min(680px, 95vw)', maxHeight: '85vh', borderTop: `3px solid ${v.color}` }}
              className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[20px] flex flex-col overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              {/* Sticky header */}
              <div className="flex items-start justify-between p-5 border-b border-[var(--border)] sticky top-0 bg-[var(--bg-elevated)] z-10">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{p.name}</h2>
                    {p.vulnerabilityLevel && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: v.color, backgroundColor: v.bg }}>
                        {p.vulnerabilityLevel}
                      </span>
                    )}
                  </div>
                  {p.population && <span className="text-[12px] text-[var(--text-tertiary)]">Population: {(p.population / 1000).toFixed(0)}k</span>}
                </div>
                <button onClick={() => setSelectedPlace(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-5">
                {/* Temperature + sparkline */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    {latest ? (
                      <>
                        <span className="text-[48px] font-extrabold leading-none tracking-[-0.04em]" style={{ color: v.color }}>{latest.avgTemp.toFixed(1)}<span className="text-[24px] align-super opacity-60">°C</span></span>
                        <span className="text-[11px] text-[var(--text-tertiary)] mt-1">Max: {latest.maxTemp?.toFixed(1) ?? '—'}°C &middot; {new Date(latest.date).toLocaleDateString()}</span>
                      </>
                    ) : p.vulnerabilityScore != null ? (
                      <>
                        <span className="text-[48px] font-extrabold leading-none tracking-[-0.04em]" style={{ color: v.color }}>{Math.round(p.vulnerabilityScore)}</span>
                        <span className="text-[11px] text-[var(--text-tertiary)] mt-1 uppercase tracking-wide font-semibold">Vulnerability Score</span>
                      </>
                    ) : (
                      <span className="text-[14px] text-[var(--text-tertiary)]">No data yet</span>
                    )}
                  </div>
                  {temps.length >= 2 && <Sparkline data={temps} color={v.color} />}
                </div>

                {/* Stats strip */}
                <div className="grid grid-cols-4 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border)] divide-x divide-[var(--border)] overflow-hidden">
                  {[
                    { val: p.population != null ? `${(p.population / 1000).toFixed(0)}k` : '—', lbl: 'pop' },
                    { val: p.areaSqkm != null ? `${p.areaSqkm.toFixed(1)}` : '—', lbl: 'km²' },
                    { val: latest?.treeCanopyPct != null ? `${latest.treeCanopyPct.toFixed(0)}%` : '—', lbl: 'canopy' },
                    { val: String(p.heatMeasurements.length), lbl: 'logs' },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} className="flex flex-col items-center py-3 gap-0.5">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">{val}</span>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">{lbl}</span>
                    </div>
                  ))}
                </div>

                {/* Measurement history */}
                {p.heatMeasurements.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Measurement History</h3>
                    <div className="overflow-x-auto rounded-[10px] border border-[var(--border)]">
                      <table className="w-full text-xs">
                        <thead className="bg-[var(--bg-surface)]">
                          <tr className="border-b border-[var(--border)]">
                            {['Date', 'Avg °C', 'Max °C', 'Canopy', 'Source'].map((h, i) => (
                              <th key={h} className={`py-2 px-3 text-[9px] uppercase tracking-widest font-normal text-[var(--text-tertiary)] ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {p.heatMeasurements.map((m, idx) => (
                            <tr key={m.id} className={`border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)] transition-colors ${idx % 2 === 0 ? '' : 'bg-[rgba(255,255,255,0.01)]'}`}>
                              <td className="py-1.5 px-3 text-[var(--text-secondary)]">{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                              <td className="py-1.5 px-3 text-right font-semibold tabular-nums" style={{ color: v.color }}>{m.avgTemp.toFixed(1)}</td>
                              <td className="py-1.5 px-3 text-right tabular-nums text-[var(--text-secondary)]">{m.maxTemp != null ? m.maxTemp.toFixed(1) : '—'}</td>
                              <td className="py-1.5 px-3 text-right text-[var(--text-secondary)]">{m.treeCanopyPct != null ? `${m.treeCanopyPct.toFixed(0)}%` : '—'}</td>
                              <td className="py-1.5 px-3 text-right"><span className="text-[9px] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] px-1.5 py-0.5 rounded">{m.dataSource}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Add data inline */}
                {addDataFor === p.id ? (
                  <form onSubmit={e => handleAddMeasurement(e, p.id)} className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[12px] p-4 flex flex-col gap-3">
                    <h3 className="text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] font-semibold">Add Measurement</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input name="date" type="date" required className={IC} />
                      <input name="avgTemp" type="number" step="0.1" required placeholder="Avg °C *" className={IC} />
                      <input name="maxTemp" type="number" step="0.1" required placeholder="Max °C *" className={IC} />
                      <input name="minTemp" type="number" step="0.1" placeholder="Min °C" className={IC} />
                      <input name="treeCanopyPct" type="number" step="0.1" placeholder="Canopy %" className={IC} />
                      <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious %" className={IC} />
                      <input name="dataSource" placeholder="Source" className={IC} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setAddDataFor(null)} className="px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Cancel</button>
                      <button type="submit" disabled={isPending} className="px-4 py-1.5 text-xs bg-[var(--green-500)] text-white rounded-[8px] disabled:opacity-50 font-semibold">Save</button>
                    </div>
                  </form>
                ) : null}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 p-4 border-t border-[var(--border)] bg-[var(--bg-surface)]">
                {deleteConfirmId === `popup-${p.id}` ? (
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="text-[12px] text-[#f87171]">Permanently delete <strong>{p.name}</strong>?</span>
                    <div className="flex gap-2">
                      <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 text-[11px] border border-[var(--border)] rounded-[8px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                      <button onClick={() => handleDeletePlace(p.id)} disabled={isDeleting} className="px-3 py-1.5 text-[11px] bg-[#ef4444] text-white rounded-[8px] disabled:opacity-50 font-semibold">
                        {isDeleting ? 'Deleting…' : 'Confirm Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setDeleteConfirmId(`popup-${p.id}`)} className="px-3 py-2 text-[11px] text-[#ef4444] border border-[rgba(239,68,68,0.30)] rounded-[8px] hover:bg-[rgba(239,68,68,0.08)] transition-colors font-medium">
                      Delete
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => setAddDataFor(addDataFor === p.id ? null : p.id)} className="px-3 py-2 text-[11px] font-medium text-[#60a5fa] border border-[rgba(59,130,246,0.30)] rounded-[8px] hover:bg-[rgba(59,130,246,0.08)] transition-colors">
                      + Add Data
                    </button>
                    <Link href={`/dashboard/map?placeId=${p.id}&placeName=${encodeURIComponent(p.name)}`} className="px-3 py-2 text-[11px] font-medium text-[#06b6d4] border border-[rgba(6,182,212,0.30)] rounded-[8px] hover:bg-[rgba(6,182,212,0.08)] transition-colors">
                      View Map
                    </Link>
                    <button
                      onClick={() => { setScenarioLoading(p.id); router.push(`/dashboard/scenarios/new?placeId=${p.id}`); }}
                      disabled={scenarioLoading === p.id}
                      className="px-3 py-2 text-[11px] font-semibold text-[#22c55e] border border-[rgba(34,197,94,0.30)] rounded-[8px] hover:bg-[rgba(34,197,94,0.1)] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {scenarioLoading === p.id
                        ? <><span className="w-3 h-3 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />Loading…</>
                        : 'Build Scenario →'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ADD PLACE MODAL ──────────────────────────────────────────────── */}
      {showAddPlace && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowAddPlace(false)}>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] border-t-2 border-t-[rgba(34,197,94,0.40)] rounded-[20px] p-[24px] max-w-[480px] w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-[17px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#22c55e] text-[18px]">add_location_alt</span>
                  Add a Place
                </h2>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">Track heat vulnerability for a new location</p>
              </div>
              <button onClick={() => setShowAddPlace(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-full w-8 h-8 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[var(--bg-surface)] p-1 rounded-[10px] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setAddPlaceTab('search')}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-1.5 ${addPlaceTab === 'search' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
              >
                <span className="material-symbols-outlined text-[14px]">search</span> Search
              </button>
              <button
                type="button"
                onClick={() => setAddPlaceTab('manual')}
                className={`flex-1 py-2 text-[12px] font-semibold rounded-[8px] transition-colors flex items-center justify-center gap-1.5 ${addPlaceTab === 'manual' ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
              >
                <span className="material-symbols-outlined text-[14px]">edit</span> Manual
              </button>
            </div>

            <form onSubmit={handleAddPlace} className="flex flex-col gap-4">
              {addPlaceTab === 'search' ? (
                <>
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Search Location</label>
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search for a place (e.g. Bolpur, Dharavi)"
                      className={IC}
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[8px] overflow-hidden z-50 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        {searchResults.map(r => (
                          <button
                            key={r.place_id} type="button"
                            onClick={() => {
                                setLat(parseFloat(r.lat));
                              setLng(parseFloat(r.lon));
                              setSearchResults([]);
                              setSearchQuery(r.display_name);
                            }}
                            className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-surface)] border-b border-[var(--border)] last:border-b-0 text-[var(--text-primary)]"
                          >
                            {r.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                    {lat && lng && (
                      <div className="mt-2 p-2 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)] rounded-[8px]">
                        <p className="text-[11px] text-[#22c55e]">📍 {Math.abs(lat).toFixed(4)}°{lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}°{lng >= 0 ? 'E' : 'W'}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Temperature data will be fetched automatically</p>
                      </div>
                    )}
                  </div>
                  {lat && lng && (
                    <>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Place Name (auto-filled)</label>
                        <input name="name" required placeholder="Name" defaultValue={searchQuery.split(',')[0]} className={IC} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Population</label>
                          <input name="population" type="number" placeholder="Total people" className={IC} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Area (km²)</label>
                          <input name="areaSqkm" type="number" step="0.01" placeholder="Size" className={IC} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Place Name</label>
                    <input name="name" required placeholder="e.g. Downtown Core" className={IC} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Population</label>
                      <input name="population" type="number" placeholder="Total people" className={IC} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Area (km²)</label>
                      <input name="areaSqkm" type="number" step="0.01" placeholder="Size" className={IC} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Median Income</label>
                      <input name="medianIncome" type="number" placeholder="Local currency" className={IC} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">% Elderly</label>
                      <input name="pctElderly" type="number" step="0.1" placeholder="Over 65s" className={IC} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">% Children</label>
                      <input name="pctChildren" type="number" step="0.1" placeholder="Under 15s" className={IC} />
                    </div>
                  </div>
                </>
              )}

              {error && <p className="text-[12px] text-[var(--critical)]">{error}</p>}
              <div className="flex gap-3 pt-4 mt-1 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowAddPlace(false)} className="flex-1 h-[40px] text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending || (addPlaceTab === 'search' && !lat)} className="flex-1 h-[40px] text-[13px] bg-[var(--green-500)] text-white rounded-[10px] hover:bg-[var(--green-400)] disabled:opacity-50 transition-all font-semibold shadow-[0_0_16px_rgba(34,197,94,0.25)]">
                  {isPending ? 'Saving…' : 'Save Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>{/* end main content wrapper */}
    </div>
  );
}
