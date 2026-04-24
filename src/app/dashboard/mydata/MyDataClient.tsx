'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addPlaceAction, addHeatMeasurementAction, updatePlaceAction } from '@/lib/actions';

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
interface ReportData { id: string; title: string; status: string; generatedAt: string; generatedBy: string | null }
interface AuditData { id: string; action: string; resourceType: string | null; createdAt: string; userName: string | null }
interface Props {
  city: CityData; places: PlaceData[]; stats: StatsData;
  completeness: CompletenessData; teamCount: number;
  scenarios: ScenarioData[]; reports: ReportData[];
  auditLogs: AuditData[]; userId: string; cityId: string;
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
      } catch (e) {}
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

// ─── Place Card ───────────────────────────────────────────────────────────────
interface CardProps {
  place: PlaceData;
  expanded: boolean;
  onToggle: () => void;
  addDataOpen: boolean;
  onOpenAddData: () => void;
  onCloseAddData: () => void;
  onSubmitMeas: (e: React.FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  index: number;
}

function PlaceCard({ place, expanded, onToggle, addDataOpen, onOpenAddData, onCloseAddData, onSubmitMeas, isPending, index }: CardProps) {
  const v = vl(place.vulnerabilityLevel);
  const latest = place.heatMeasurements[0];
  const temps  = place.heatMeasurements.map(m => m.avgTemp);
  const trend = temps.length >= 2 ? temps[0] - (temps.slice(1).reduce((a,b)=>a+b,0)/(temps.length-1)) : null;

  const hasHeatData = place.heatMeasurements.length > 0;
  const hasVuln = place.vulnerabilityScore != null;

  return (
    <div
      className="group relative flex flex-col border rounded-[16px] overflow-hidden transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, opacity: 0, animationFillMode: 'forwards', animationName: 'revealUp', background: v.grad, borderColor: v.border }}
    >
      <div className="relative z-10 flex flex-col flex-1">
        {/* ── Header ── */}
        <div className="px-[20px] pt-[20px] cursor-pointer select-none" onClick={onToggle}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-[16px] font-bold text-[var(--text-primary)] leading-snug tracking-[-0.02em]">{place.name}</h3>
            {place.vulnerabilityLevel && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ color: v.color, backgroundColor: v.bg, boxShadow: `0 0 8px ${v.color}40` }}>
                {place.vulnerabilityLevel}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2 mt-3">
            
            {hasVuln && !hasHeatData ? (
              <div className="flex flex-col">
                <div>
                  <span className="text-[42px] font-extrabold leading-none tracking-[-0.05em]" style={{ color: v.color }}>
                    {Math.round(place.vulnerabilityScore!)}
                  </span>
                </div>
                <div className="flex flex-col mt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: v.color }}>vulnerability score</span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] mt-1">
                    {place.vulnerabilityLevel === 'CRITICAL' ? 'CRITICAL risk — immediate action required' :
                     place.vulnerabilityLevel === 'HIGH' ? 'HIGH risk — intervention recommended' :
                     place.vulnerabilityLevel === 'MODERATE' ? 'MODERATE risk — consider interventions' :
                     'LOW risk — monitoring only'}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-1">Based on climate estimates</span>
                </div>
              </div>
            ) : hasHeatData && latest ? (
              <div className="flex flex-col">
                <div>
                  <span className="text-[42px] font-extrabold leading-none tracking-[-0.05em]" style={{ color: v.color }}>
                    {latest.avgTemp.toFixed(1)}
                  </span>
                  <span className="text-[20px] font-extrabold leading-none tracking-[-0.05em] align-super" style={{ color: v.color, opacity: 0.6 }}>
                    °C
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    max {latest.maxTemp != null ? latest.maxTemp.toFixed(1) : '—'}°C
                  </span>
                </div>
                {trend !== null && (
                  <div className="mt-1" style={{ color: trend > 0.5 ? '#ef4444' : trend < -0.5 ? '#22c55e' : 'var(--text-tertiary)' }}>
                    <span className="text-[10px] font-medium">
                      {trend > 0.5 ? `↑ ${trend.toFixed(1)}°C warmer than avg` : trend < -0.5 ? `↓ ${Math.abs(trend).toFixed(1)}°C cooler than avg` : '→ Stable temperature'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col mt-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px] text-[var(--text-tertiary)]">cloud_off</span>
                  <span className="text-[13px] text-[var(--text-secondary)] font-medium">No data yet</span>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] mb-3">Add heat data or generate a scenario to see vulnerability analysis</span>
                <div className="flex gap-2">
                  <button onClick={e => { e.stopPropagation(); onOpenAddData(); }} className="px-2.5 py-1 text-[10px] font-semibold bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded text-[#60a5fa] hover:bg-[#3b82f6]/20 transition-colors">
                    + Add Data
                  </button>
                  <Link href={`/dashboard/scenarios/new?placeId=${place.id}`} onClick={e => e.stopPropagation()} className="px-2.5 py-1 text-[10px] font-semibold bg-[rgba(34,197,94,0.1)] text-[#22c55e] border border-[rgba(34,197,94,0.2)] rounded hover:bg-[rgba(34,197,94,0.2)] transition-colors">
                    Build Scenario →
                  </Link>
                </div>
              </div>
            )}
            
            {hasHeatData && <Sparkline data={temps} color={v.color} />}
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="mx-[20px] mt-[16px] rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-4 divide-x divide-[var(--border)]">
            {[
              { val: place.population != null ? `${(place.population / 1000).toFixed(0)}k` : '—', lbl: 'pop', highlightColor: '#60a5fa' },
              { val: place.areaSqkm   != null ? `${place.areaSqkm.toFixed(1)}`            : '—', lbl: 'km²', highlightColor: '#34d399' },
              { val: latest?.treeCanopyPct != null ? `${latest.treeCanopyPct.toFixed(0)}%` : '—', lbl: 'canopy', highlightColor: latest?.treeCanopyPct != null ? (latest.treeCanopyPct < 15 ? '#ef4444' : latest.treeCanopyPct <= 30 ? '#f97316' : '#22c55e') : null },
              { val: String(place.heatMeasurements.length), lbl: 'logs', highlightColor: '#c084fc' },
            ].map(({ val, lbl, highlightColor }) => (
              <div key={lbl} className="flex flex-col items-center py-[10px] gap-0.5">
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: highlightColor || 'var(--text-primary)' }}>{val}</span>
                <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        {place.vulnerabilityScore != null && (
          <div className="mx-[12px] mb-[8px] mt-[12px] px-[12px] py-[6px] bg-[var(--bg-elevated)] rounded-[6px] border border-[var(--border)]">
            <span className="text-[10px] text-[var(--text-secondary)]">
              {place.vulnerabilityScore >= 80 ? "🌍 Among top 15% most heat-vulnerable places globally" :
               place.vulnerabilityScore >= 60 ? "⚠️ Above global urban heat average" :
               place.vulnerabilityScore >= 40 ? "📊 Near global urban heat average" :
               "✓ Below global urban heat average"}
            </span>
          </div>
        )}

        {/* ── Action row ── */}
        <div className="px-[12px] py-[8px] border-t border-[var(--border)] bg-[var(--bg-base)]/50 backdrop-blur-sm flex items-center gap-1">
          <button
            onClick={onToggle}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm leading-none">{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
            {expanded ? 'Hide' : `${place.heatMeasurements.length} readings`}
          </button>
          <div className="flex-1" />
          <button
            onClick={e => { e.stopPropagation(); onOpenAddData(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[#3b82f6] hover:bg-[rgba(59,130,246,0.08)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm leading-none">add_circle</span>
            Data
          </button>
          <Link
            href={`/dashboard/map?placeId=${place.id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[#06b6d4] hover:bg-[rgba(6,182,212,0.08)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm leading-none">map</span>
            Map
          </Link>
          <Link
            href={`/dashboard/scenarios/new?placeId=${place.id}`}
            onClick={e => e.stopPropagation()}
            className="ml-1 flex items-center gap-1 px-[10px] py-[4px] rounded-[8px] text-[11px] font-semibold transition-all"
            style={{ 
              backgroundColor: 'rgba(34,197,94,0.12)', 
              borderColor: 'rgba(34,197,94,0.30)', 
              borderWidth: '1px', 
              color: '#22c55e' 
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.20)';
              e.currentTarget.style.borderColor = 'rgba(34,197,94,0.50)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(34,197,94,0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.12)';
              e.currentTarget.style.borderColor = 'rgba(34,197,94,0.30)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span className="material-symbols-outlined text-sm leading-none">science</span>
            Scenario
          </Link>
        </div>

        {/* ── Expanded: measurements table ── */}
        {expanded && (
          <div className="border-t border-[var(--border)] bg-gradient-to-b from-[var(--bg-base)] to-transparent relative z-10">
            {addDataOpen && (
              <form
                onSubmit={onSubmitMeas}
                className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-[12px] m-[12px] p-[16px]"
                onClick={e => e.stopPropagation()}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  <input name="date" type="date" required className={IC} />
                  <input name="avgTemp" type="number" step="0.1" required placeholder="Avg °C *" className={IC} />
                  <input name="maxTemp" type="number" step="0.1" required placeholder="Max °C *" className={IC} />
                  <input name="minTemp" type="number" step="0.1" placeholder="Min °C" className={IC} />
                  <input name="treeCanopyPct" type="number" step="0.1" placeholder="Canopy %" className={IC} />
                  <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious %" className={IC} />
                  <input name="dataSource" placeholder="Source" className={IC} />
                </div>
                <div className="flex gap-2 items-center justify-end">
                  <button type="button" onClick={onCloseAddData}
                    className="px-3 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending}
                    className="px-4 py-1.5 text-xs bg-[var(--green-500)] text-white rounded-[8px] hover:bg-[var(--green-400)] disabled:opacity-50 transition-colors font-semibold shadow-[0_0_12px_rgba(34,197,94,0.2)]">
                    Save
                  </button>
                </div>
              </form>
            )}

            {place.heatMeasurements.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--bg-base)] sticky top-0 z-10">
                    <tr className="border-b border-[var(--border)]">
                      {['Date', 'Avg °C', 'Max °C', 'Canopy', 'Source'].map((h, idx) => (
                        <th key={h} className={`py-2 px-3 font-normal text-[9px] uppercase tracking-widest text-[var(--text-tertiary)] ${idx === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {place.heatMeasurements.slice(0, 6).map((m, idx) => (
                      <tr key={m.id} className={`border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)] transition-colors ${idx % 2 === 0 ? 'bg-[rgba(255,255,255,0.01)]' : ''}`}>
                        <td className="py-1.5 px-3 text-[var(--text-secondary)]">
                          {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold tabular-nums" style={{ color: v.color }}>
                          {m.avgTemp.toFixed(1)}
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {m.maxTemp != null ? m.maxTemp.toFixed(1) : '—'}
                        </td>
                        <td className="py-1.5 px-3 text-right text-[var(--text-secondary)]">
                          {m.treeCanopyPct != null ? `${m.treeCanopyPct.toFixed(0)}%` : '—'}
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <span className="text-[9px] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] px-1.5 py-0.5 rounded">
                            {m.dataSource}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              !addDataOpen && <p className="p-4 text-center text-xs text-[var(--text-tertiary)]">No measurements recorded yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyDataClient(props: Props) {
  const { city, places, stats, completeness, scenarios, auditLogs, cityId } = props;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // UI state
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [addDataFor,    setAddDataFor]    = useState<string | null>(null);
  const [showAddPlace,  setShowAddPlace]  = useState(false);
  const [error,         setError]         = useState('');
  
  // Search state
  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, setResults: setSearchResults } = useNominatimSearch();
  const [showManual, setShowManual] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

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
        await updatePlaceAction(data.placeId, {
          population:    fd.get('population')   ? Number(fd.get('population'))   : undefined,
          areaSqkm:      fd.get('areaSqkm')     ? Number(fd.get('areaSqkm'))     : undefined,
          medianIncome:  fd.get('medianIncome') ? Number(fd.get('medianIncome')) : undefined,
          pctElderly:    fd.get('pctElderly')   ? Number(fd.get('pctElderly'))   : undefined,
          pctChildren:   fd.get('pctChildren')  ? Number(fd.get('pctChildren'))  : undefined,
        });
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
      }
      setShowAddPlace(false);
      setSearchQuery(''); setLat(null); setLng(null); setShowManual(false);
      startTransition(() => router.refresh());
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 pb-20 relative" style={{
      background: `radial-gradient(ellipse 80% 40% at 20% 0%, rgba(34,197,94,0.04) 0%, transparent 60%),
                   radial-gradient(ellipse 60% 30% at 80% 100%, rgba(59,130,246,0.03) 0%, transparent 60%),
                   var(--bg-base)`
    }}>

      {/* ── Sticky Header ── */}
      <div 
        className={`fixed top-[60px] left-0 right-0 z-40 h-[40px] bg-[var(--bg-base)]/80 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-6 transition-opacity duration-300 pointer-events-none md:pl-[280px] ${showStickyHeader ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-xs font-semibold text-[var(--text-primary)]">Data Hub</span>
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
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>storage</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-tertiary)]">My Data</span>
          </div>
          <h1 className="text-[32px] font-bold tracking-[-0.03em] text-[var(--text-primary)] leading-tight">Data Hub</h1>
          <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] mt-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--green-500)]"></span>
            </span>
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {city.name}{city.state ? `, ${city.state}` : ''} &middot; {city.country}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--green-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--green-500)]"></span>
            </span>
            <span className="text-[11px] text-[var(--green-400)] font-medium">Live</span>
          </div>
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
          { icon: 'location_on', label: 'Total Places',    val: String(stats.totalPlaces),                                                     accent: '#3b82f6', valColor: '#60a5fa', context: 'monitored locations', bgGlow: 'rgba(59,130,246,0.06)' },
          { icon: 'thermostat',  label: 'Avg Temperature', val: avgTemp != null ? `${avgTemp.toFixed(1)}°C` : '—',                  accent: '#f97316', valColor: '#fb923c', context: 'latest readings average', bgGlow: 'rgba(249,115,22,0.06)' },
          { icon: 'groups',      label: 'Vulnerable Pop',  val: vulnerablePop > 0 ? `${(vulnerablePop / 1000).toFixed(0)}k` : '—',      accent: '#ef4444', valColor: '#f87171', context: 'in HIGH/CRITICAL zones', bgGlow: 'rgba(239,68,68,0.06)' },
          { icon: 'sensors',     label: 'Monitored Zones', val: `${activePlaces} / ${stats.totalPlaces}`,                                   accent: '#22c55e', valColor: '#4ade80', context: 'zones with active data', bgGlow: 'rgba(34,197,94,0.06)' },
        ] as const).map(({ icon, label, val, accent, valColor, context, bgGlow }) => (
          <div key={label} className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] rounded-[16px] p-[20px] flex flex-col relative overflow-hidden group" style={{ borderTop: `2px solid ${accent}`, background: `linear-gradient(180deg, ${bgGlow} 0%, transparent 40%), var(--bg-surface)` }}>
            {/* Background Icon */}
            <span className="material-symbols-outlined absolute top-[12px] right-[12px] text-[48px] text-white opacity-[0.04] pointer-events-none select-none transition-transform group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
              {icon}
            </span>
            
            <div className="flex items-center gap-[6px] relative z-10">
              <span className="material-symbols-outlined text-[14px]" style={{ color: accent, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
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

        {/* ── Place cards (left 8) ── */}
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
              </div>
              {places.length === 0 && (
                <button
                  onClick={() => setShowAddPlace(true)}
                  className="mt-4 px-6 py-2.5 text-[13px] font-semibold bg-[var(--green-500)] text-white rounded-[10px] hover:bg-[var(--green-400)] transition-all shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:shadow-[0_0_28px_rgba(34,197,94,0.40)]"
                >
                  Add your first place
                </button>
              )}
            </div>
          )}

          {/* Card grid */}
          {filtered.length > 0 && (
            <div className={`grid gap-4 ${filtered.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {filtered.map((p, i) => (
                <PlaceCard
                  key={p.id} place={p} expanded={expandedPlace === p.id}
                  onToggle={() => setExpandedPlace(expandedPlace === p.id ? null : p.id)}
                  addDataOpen={addDataFor === p.id}
                  onOpenAddData={() => { setExpandedPlace(p.id); setAddDataFor(p.id); }}
                  onCloseAddData={() => setAddDataFor(null)}
                  onSubmitMeas={e => handleAddMeasurement(e, p.id)}
                  isPending={isPending} index={i}
                />
              ))}
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

          {/* Recent scenarios */}
          {scenarios.length > 0 && (
            <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#eab308] rounded-[16px] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#eab308] flex items-center gap-1.5 border-l-2 border-[#eab308] pl-2">
                  <span className="material-symbols-outlined text-[14px]">history</span>
                  Recent Scenarios
                </h2>
                <Link href="/dashboard/scenarios" className="text-[10px] font-semibold hover:underline" style={{ color: '#eab308' }}>
                  View all
                </Link>
              </div>
              <div className="flex flex-col gap-2">
                {scenarios.slice(0, 4).map(s => {
                  const sc: Record<string, string> = { APPROVED: '#22c55e', SUBMITTED: '#eab308', DRAFT: 'var(--text-tertiary)', REJECTED: '#ef4444' };
                  return (
                    <Link key={s.id} href={`/dashboard/scenarios/${s.id}`} className="group flex items-center justify-between gap-2 px-3 py-2.5 bg-[var(--bg-elevated)] rounded-[10px] border border-[var(--border)] hover:bg-[var(--bg-base)] hover:border-[var(--border-strong)] transition-all duration-150 hover:translate-x-[2px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc[s.status] ?? 'var(--text-tertiary)' }} />
                        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate transition-colors group-hover:text-[var(--green-400)]">{s.name}</span>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase rounded border" style={{ color: sc[s.status] ?? 'var(--text-tertiary)', backgroundColor: `${sc[s.status] ?? 'var(--text-tertiary)'}1a`, borderColor: `${sc[s.status] ?? 'var(--text-tertiary)'}4d` }}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#a855f7] rounded-[16px] overflow-hidden flex flex-col">
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#a855f7] flex items-center gap-1.5 border-l-2 border-[#a855f7] pl-2">
                <span className="material-symbols-outlined text-[14px]">link</span>
                Quick Links
              </h2>
            </div>
            <div className="flex flex-col">
              {[
                { href: '/dashboard/map',       icon: 'map',         label: 'Open Map'      },
                { href: '/dashboard/scenarios', icon: 'science',     label: 'All Scenarios' },
                { href: '/dashboard/reports',   icon: 'summarize',   label: 'Reports'       },
                { href: '/dashboard/data',      icon: 'upload_file', label: 'Import Data'   },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href} href={href}
                  className="group relative flex items-center gap-3 px-5 py-3 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors border-t border-[var(--border)]"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                  <span className="material-symbols-outlined text-[16px] text-[#a855f7] transition-all group-hover:text-[#c084fc] group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 0" }}>{icon}</span>
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto material-symbols-outlined text-[16px] text-[#a855f7] transition-transform duration-150 group-hover:translate-x-[2px] group-hover:text-[#c084fc]">chevron_right</span>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Recent Activity */}
          {auditLogs.length > 0 && (
            <div className="bg-[var(--bg-surface)] border-r border-b border-l border-[var(--border)] border-t-[2px] border-t-[#06b6d4] rounded-[16px] p-5 flex flex-col gap-3">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[#06b6d4] flex items-center gap-1.5 border-l-2 border-[#06b6d4] pl-2">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Recent Activity
              </h2>
              <div className="flex flex-col gap-3 mt-1">
                {auditLogs.map(log => {
                  let color = '#22c55e'; // default green
                  let text = 'Performed an action';
                  if (log.action === 'CREATE') {
                    color = '#22c55e';
                    text = `Added a new ${log.resourceType?.toLowerCase() || 'item'}`;
                    if (log.resourceType === 'Place') text = 'Added a new place';
                    if (log.resourceType === 'HeatMeasurement') text = 'Recorded temperature data';
                    if (log.resourceType === 'Scenario') text = 'Generated scenario';
                    if (log.resourceType === 'Report') text = 'Created PDF report';
                  } else if (log.action === 'UPDATE') {
                    color = '#3b82f6';
                    text = `Updated ${log.resourceType?.toLowerCase() || 'item'}`;
                  } else if (log.action === 'DELETE') {
                    color = '#ef4444';
                    text = `Deleted ${log.resourceType?.toLowerCase() || 'item'}`;
                  } else if (log.action === 'LOGIN') {
                    color = '#a855f7';
                    text = 'Logged in';
                  } else if (log.action === 'GENERATE') {
                    color = '#f97316';
                    text = `Generated ${log.resourceType?.toLowerCase() || 'content'}`;
                  }
                  
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex flex-col">
                        <span className="text-[12px] text-[var(--text-primary)]">{text}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* ── ADD PLACE MODAL ──────────────────────────────────────────────── */}
      {showAddPlace && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowAddPlace(false)}>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] border-t-2 border-t-[rgba(34,197,94,0.40)] rounded-[20px] p-[24px] max-w-[440px] w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[17px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#22c55e] text-[18px]">add_location_alt</span>
                  Add a Place
                </h2>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">Enter details to start tracking heat vulnerability</p>
              </div>
              <button onClick={() => setShowAddPlace(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors bg-[var(--bg-surface)] border border-[var(--border)] rounded-full w-8 h-8 flex items-center justify-center hover:border-[var(--border-strong)]">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddPlace} className="flex flex-col gap-4">
              {/* Search Flow */}
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
                           const name = r.display_name.split(',')[0];
                           setLat(parseFloat(r.lat));
                           setLng(parseFloat(r.lon));
                           setSearchResults([]);
                           setSearchQuery(r.display_name);
                           setShowManual(true);
                           const form = document.getElementById('add-place-form') as HTMLFormElement;
                           if (form) {
                             const nameInput = form.elements.namedItem('name') as HTMLInputElement;
                             if (nameInput) nameInput.value = name;
                           }
                        }}
                        className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--bg-surface)] border-b border-[var(--border)] last:border-b-0 text-[var(--text-primary)]"
                      >
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
                {lat && lng && (
                  <div className="mt-2 p-2 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.2)] rounded">
                    <p className="text-[11px] text-[#22c55e]">📍 {Math.abs(lat).toFixed(2)}°{lat>=0?'N':'S'}, {Math.abs(lng).toFixed(2)}°{lng>=0?'E':'W'}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] mt-1">Coordinates saved. Temperature data will be fetched automatically when you save.</p>
                  </div>
                )}
              </div>
              
              <button type="button" onClick={() => setShowManual(!showManual)} className="text-[11px] text-[var(--text-tertiary)] underline hover:text-[var(--text-primary)] text-left block">
                {showManual ? 'Hide manual fields' : 'Or enter manually'}
              </button>

              <div id="add-place-form" className={`flex flex-col gap-4 ${showManual ? 'block' : 'hidden'}`}>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-semibold ml-1">Place Name</label>
                  <input name="name" required placeholder="e.g. Downtown Core" className={IC} />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-2 border-t border-[var(--border)]">
                <button type="button" onClick={() => setShowAddPlace(false)} className="flex-1 h-[40px] text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="flex-1 h-[40px] text-[13px] bg-[var(--green-500)] text-white rounded-[10px] hover:bg-[var(--green-400)] disabled:opacity-50 transition-all font-semibold shadow-[0_0_16px_rgba(34,197,94,0.25)] hover:shadow-[0_0_24px_rgba(34,197,94,0.40)]">
                  Save Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
