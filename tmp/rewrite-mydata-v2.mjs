/**
 * Rewrites src/app/dashboard/mydata/MyDataClient.tsx with a revamped UI.
 * Run: node tmp/rewrite-mydata-v2.mjs
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, '../src/app/dashboard/mydata/MyDataClient.tsx');

const code = `'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addPlaceAction, addHeatMeasurementAction } from '@/lib/actions';

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
const VULN: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  MODERATE: { color: '#eab308', bg: 'rgba(234,179,8,0.10)'  },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.10)'  },
  _:        { color: '#555555', bg: 'transparent'            },
};
function vl(level: string | null) { return VULN[level ?? '_'] ?? VULN['_']; }

// ─── Shared input class ───────────────────────────────────────────────────────
const IC = 'px-2.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] w-full transition-colors';

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const pts = [...data].slice(0, 8).reverse();
  if (pts.length < 2) return null;
  const lo = Math.min(...pts), hi = Math.max(...pts), r = (hi - lo) || 1;
  const W = 72, H = 26;
  const d = pts.map((v, i) => {
    const x = ((i / (pts.length - 1)) * (W - 6) + 3).toFixed(1);
    const y = (H - 5 - ((v - lo) / r) * (H - 10)).toFixed(1);
    return \`\${i === 0 ? 'M' : 'L'}\${x},\${y}\`;
  }).join(' ');
  const lx = (W - 3).toFixed(1);
  const ly = (H - 5 - ((pts.at(-1)! - lo) / r) * (H - 10)).toFixed(1);
  return (
    <svg width={W} height={H} viewBox={\`0 0 \${W} \${H}\`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
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
}

function PlaceCard({ place, expanded, onToggle, addDataOpen, onOpenAddData, onCloseAddData, onSubmitMeas, isPending }: CardProps) {
  const v = vl(place.vulnerabilityLevel);
  const latest = place.heatMeasurements[0];
  const prev   = place.heatMeasurements[1];
  const delta  = latest && prev ? latest.avgTemp - prev.avgTemp : null;
  const temps  = place.heatMeasurements.map(m => m.avgTemp);

  return (
    <div
      className="flex flex-col bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden transition-colors hover:border-[var(--border-strong)]"
      style={{ borderLeftColor: v.color, borderLeftWidth: '3px' }}
    >
      {/* ── Header ── */}
      <div className="p-4 pb-3 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug">{place.name}</h3>
          {place.vulnerabilityLevel && (
            <span
              className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ color: v.color, backgroundColor: v.bg }}
            >
              {place.vulnerabilityLevel}
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {latest ? (
              <>
                <span className="text-[1.625rem] font-bold leading-none tabular-nums" style={{ color: v.color }}>
                  {latest.avgTemp.toFixed(1)}&#176;C
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    max {latest.maxTemp != null ? latest.maxTemp.toFixed(1) : '\u2014'}&#176;C
                  </span>
                  {delta !== null && (
                    <span className="text-[10px]" style={{ color: delta > 0 ? '#ef4444' : '#22c55e' }}>
                      {delta > 0 ? '\u25b2' : '\u25bc'} {Math.abs(delta).toFixed(1)}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-sm text-[var(--text-tertiary)]">No data yet</span>
            )}
          </div>
          <Sparkline data={temps} color={v.color} />
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-4 divide-x divide-[var(--border)] border-y border-[var(--border)]">
        {[
          { val: place.population != null ? \`\${(place.population / 1000).toFixed(0)}k\` : '\u2014', lbl: 'pop' },
          { val: place.areaSqkm   != null ? \`\${place.areaSqkm.toFixed(1)}\`            : '\u2014', lbl: 'km\u00b2' },
          { val: latest?.treeCanopyPct != null ? \`\${latest.treeCanopyPct.toFixed(0)}%\` : '\u2014', lbl: 'canopy' },
          { val: String(place.heatMeasurements.length), lbl: 'logs' },
        ].map(({ val, lbl }) => (
          <div key={lbl} className="flex flex-col items-center py-2.5 gap-0.5">
            <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{val}</span>
            <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider">{lbl}</span>
          </div>
        ))}
      </div>

      {/* ── Intervention chips ── */}
      {place.interventions.length > 0 && (
        <div className="flex gap-1.5 px-4 py-2.5 flex-wrap border-b border-[var(--border)]">
          {place.interventions.slice(0, 3).map(i => {
            const sc: Record<string, string> = { APPROVED: '#22c55e', IN_PROGRESS: '#3b82f6', PROPOSED: '#a1a1a1', COMPLETED: '#22c55e', REJECTED: '#ef4444' };
            return (
              <span key={i.id} className="flex items-center gap-1 text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)]">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sc[i.status] ?? '#555' }} />
                <span className="text-[var(--text-secondary)] truncate max-w-[90px]">{i.name}</span>
              </span>
            );
          })}
          {place.interventions.length > 3 && (
            <span className="text-[9px] text-[var(--text-tertiary)] self-center">+{place.interventions.length - 3} more</span>
          )}
        </div>
      )}

      {/* ── Action row ── */}
      <div className="flex items-center px-2 py-1.5 gap-0.5">
        <button
          onClick={onToggle}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="material-symbols-outlined text-sm leading-none">{expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
          {expanded ? 'Hide' : \`\${place.heatMeasurements.length} readings\`}
        </button>
        <div className="flex-1" />
        <button
          onClick={e => { e.stopPropagation(); onOpenAddData(); }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[#22c55e] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="material-symbols-outlined text-sm leading-none">add_circle</span>
          Data
        </button>
        <Link
          href={\`/dashboard/map?placeId=\${place.id}\`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-[var(--text-tertiary)] hover:text-[#22c55e] hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="material-symbols-outlined text-sm leading-none">map</span>
          Map
        </Link>
        <Link
          href={\`/dashboard/scenarios/new?placeId=\${place.id}\`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors"
          style={{ color: '#22c55e' }}
        >
          <span className="material-symbols-outlined text-sm leading-none">science</span>
          Scenario
        </Link>
      </div>

      {/* ── Add measurement form (inside expanded card) ── */}
      {expanded && addDataOpen && (
        <form
          onSubmit={onSubmitMeas}
          className="border-t border-[var(--border)] bg-[var(--bg-base)] p-3 grid grid-cols-2 sm:grid-cols-4 gap-2"
          onClick={e => e.stopPropagation()}
        >
          <input name="date" type="date" required className={IC} />
          <input name="avgTemp" type="number" step="0.1" required placeholder="Avg \u00b0C *" className={IC} />
          <input name="maxTemp" type="number" step="0.1" required placeholder="Max \u00b0C *" className={IC} />
          <input name="minTemp" type="number" step="0.1" placeholder="Min \u00b0C" className={IC} />
          <input name="treeCanopyPct" type="number" step="0.1" placeholder="Canopy %" className={IC} />
          <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious %" className={IC} />
          <input name="dataSource" placeholder="Source" className={IC} />
          <div className="flex gap-2 items-center">
            <button type="submit" disabled={isPending}
              className="px-3 py-1.5 text-xs bg-[var(--green-500)] text-white rounded-md hover:bg-[var(--green-400)] disabled:opacity-50 transition-colors font-semibold">
              Save
            </button>
            <button type="button" onClick={onCloseAddData}
              className="px-2 py-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Expanded: measurements table ── */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-base)]">
          {place.heatMeasurements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {['Date', 'Avg \u00b0C', 'Max \u00b0C', 'Canopy', 'Source'].map((h, idx) => (
                      <th key={h} className={\`py-2 px-3 font-normal text-[9px] uppercase tracking-widest text-[var(--text-tertiary)] \${idx === 0 ? 'text-left' : 'text-right'}\`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {place.heatMeasurements.slice(0, 6).map(m => (
                    <tr key={m.id} className="border-b border-[var(--border)]/30 hover:bg-[var(--bg-surface)] transition-colors">
                      <td className="py-1.5 px-3 text-[var(--text-secondary)]">
                        {new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="py-1.5 px-3 text-right font-semibold tabular-nums" style={{ color: v.color }}>
                        {m.avgTemp.toFixed(1)}
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {m.maxTemp != null ? m.maxTemp.toFixed(1) : '\u2014'}
                      </td>
                      <td className="py-1.5 px-3 text-right text-[var(--text-secondary)]">
                        {m.treeCanopyPct != null ? \`\${m.treeCanopyPct.toFixed(0)}%\` : '\u2014'}
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
            <p className="p-4 text-center text-xs text-[var(--text-tertiary)]">No measurements recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MyDataClient({
  city, places, stats, completeness, teamCount,
  scenarios, reports, auditLogs, userId, cityId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // UI state
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [addDataFor,    setAddDataFor]    = useState<string | null>(null);
  const [showAddPlace,  setShowAddPlace]  = useState(false);
  const [error,         setError]         = useState('');

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
    <div className="flex flex-col gap-6">

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-sm bg-[var(--critical)]/10 border border-[var(--critical)]/40 text-[var(--critical)] rounded-lg">
          <span className="material-symbols-outlined text-base">error</span>{error}
        </div>
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className="material-symbols-outlined text-[var(--text-tertiary)] text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              storage
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-tertiary)]">
              My Data
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Data Hub</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {city.name}{city.state ? \`, \${city.state}\` : ''} &middot; {city.country}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green-400)] animate-pulse" />
            <span className="text-[11px] text-[var(--green-400)] font-medium">Live</span>
          </div>
          <button
            onClick={() => setShowAddPlace(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green-500)] text-white text-xs font-semibold hover:bg-[var(--green-400)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add Place
          </button>
        </div>
      </div>

      {/* ── KPI ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { icon: 'location_on', label: 'Total Places',    val: String(stats.totalPlaces),                                                     accent: undefined    },
          { icon: 'thermostat',  label: 'Avg Temperature', val: avgTemp != null ? \`\${avgTemp.toFixed(1)}\u00b0C\` : '\u2014',                  accent: '#ef4444'   },
          { icon: 'groups',      label: 'Vulnerable Pop',  val: vulnerablePop > 0 ? \`\${(vulnerablePop / 1000).toFixed(0)}k\` : '\u2014',      accent: '#f97316'   },
          { icon: 'sensors',     label: 'Monitored Zones', val: \`\${activePlaces} / \${stats.totalPlaces}\`,                                   accent: '#22c55e'   },
        ] as const).map(({ icon, label, val, accent }) => (
          <div key={label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className="material-symbols-outlined text-base"
                style={{ color: accent ?? 'var(--text-tertiary)', fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{label}</span>
            </div>
            <span
              className="text-xl font-bold tabular-nums text-[var(--text-primary)]"
              style={accent ? { color: accent } : {}}
            >
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* ── SEARCH + FILTER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--text-tertiary)] text-base leading-none">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={\`Search \${places.length} place\${places.length !== 1 ? 's' : ''}\u2026\`}
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span className="material-symbols-outlined text-sm leading-none">close</span>
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map(lvl => {
            const active = filterLevel === lvl;
            const c = VULN[lvl] ?? VULN['_'];
            const count = lvl !== 'ALL' ? (levelCounts[lvl] ?? 0) : places.length;
            return (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-lg uppercase tracking-wide border transition-all whitespace-nowrap"
                style={
                  active
                    ? lvl === 'ALL'
                      ? { backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }
                      : { backgroundColor: c.bg, borderColor: c.color, color: c.color }
                    : { backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }
                }
              >
                {lvl === 'ALL' ? 'All' : lvl}
                <span className="ml-1 opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Place cards (left 8) ── */}
        <div className="lg:col-span-8 flex flex-col gap-4">

          {/* Result count + clear */}
          <div className="flex items-center justify-between min-h-5">
            <span className="text-xs text-[var(--text-tertiary)]">
              Showing{' '}
              <span className="text-[var(--text-primary)] font-medium">{filtered.length}</span>
              {' '}of {places.length} place{places.length !== 1 ? 's' : ''}
              {query && (
                <span className="ml-1">
                  matching &ldquo;<span className="text-[var(--text-primary)]">{query}</span>&rdquo;
                </span>
              )}
            </span>
            {(query || filterLevel !== 'ALL') && (
              <button
                onClick={() => { setQuery(''); setFilterLevel('ALL'); }}
                className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
              <span
                className="material-symbols-outlined text-4xl text-[var(--text-tertiary)]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {places.length === 0 ? 'add_location_alt' : 'search_off'}
              </span>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {places.length === 0 ? 'No places added yet' : \`No places match &ldquo;\${query}&rdquo;\`}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  {places.length === 0 ? 'Start by adding your first monitored location.' : 'Try a different name or clear the filter.'}
                </p>
              </div>
              {places.length === 0 && (
                <button
                  onClick={() => setShowAddPlace(true)}
                  className="px-5 py-2 text-xs font-semibold bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-400)] transition-colors"
                >
                  Add your first place
                </button>
              )}
            </div>
          )}

          {/* Card grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map(p => (
                <PlaceCard
                  key={p.id}
                  place={p}
                  expanded={expandedPlace === p.id}
                  onToggle={() => setExpandedPlace(expandedPlace === p.id ? null : p.id)}
                  addDataOpen={addDataFor === p.id}
                  onOpenAddData={() => { setExpandedPlace(p.id); setAddDataFor(p.id); }}
                  onCloseAddData={() => setAddDataFor(null)}
                  onSubmitMeas={e => handleAddMeasurement(e, p.id)}
                  isPending={isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar (right 4) ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">

          {/* Interventions overview */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Interventions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">Active</span>
                <span className="text-xl font-bold" style={{ color: '#22c55e' }}>{stats.activeInterventions}</span>
              </div>
              <div className="bg-[var(--bg-elevated)] rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">Completed</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">{stats.completedInterventions}</span>
              </div>
              {stats.totalProjectedReduction > 0 && (
                <div className="col-span-2 bg-[var(--bg-elevated)] rounded-lg p-3 flex flex-col gap-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-[var(--text-tertiary)]">Projected cooling</span>
                  <span className="text-2xl font-bold" style={{ color: '#22c55e' }}>
                    -{stats.totalProjectedReduction.toFixed(1)}\u00b0C
                  </span>
                  <span className="text-[9px] text-[var(--text-tertiary)]">if active plans implemented</span>
                </div>
              )}
            </div>
          </div>

          {/* Data completeness */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Data Completeness
              </h2>
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {completeness.overall}%
              </span>
            </div>
            {[
              { label: 'Temp Layer',    pct: tempLayerPct,         color: '#22c55e' },
              { label: 'Tree Canopy',   pct: canopyLayPct,         color: '#22c55e' },
              { label: 'Boundaries',    pct: boundaryPct,          color: '#f97316' },
              { label: 'Overall Index', pct: completeness.overall, color: '#eab308' },
            ].map(({ label, pct, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: \`\${pct}%\`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recent scenarios */}
          {scenarios.length > 0 && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Recent Scenarios
                </h2>
                <Link href="/dashboard/scenarios" className="text-[10px] hover:underline" style={{ color: '#22c55e' }}>
                  View all
                </Link>
              </div>
              {scenarios.slice(0, 4).map(s => {
                const sc: Record<string, string> = {
                  APPROVED: '#22c55e', SUBMITTED: '#eab308', DRAFT: 'var(--text-tertiary)', REJECTED: '#ef4444',
                };
                return (
                  <Link
                    key={s.id}
                    href={\`/dashboard/scenarios/\${s.id}\`}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--bg-elevated)] rounded-lg hover:bg-[var(--bg-base)] transition-colors"
                  >
                    <span className="text-xs text-[var(--text-primary)] truncate">{s.name}</span>
                    <span
                      className="shrink-0 text-[9px] font-bold uppercase"
                      style={{ color: sc[s.status] ?? 'var(--text-tertiary)' }}
                    >
                      {s.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Quick links */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="px-4 pt-3 pb-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Quick Links
              </h2>
            </div>
            {[
              { href: '/dashboard/map',       icon: 'map',         label: 'Open Map'      },
              { href: '/dashboard/scenarios', icon: 'science',     label: 'All Scenarios' },
              { href: '/dashboard/reports',   icon: 'summarize',   label: 'Reports'       },
              { href: '/dashboard/data',      icon: 'upload_file', label: 'Import Data'   },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors border-t border-[var(--border)]"
              >
                <span
                  className="material-symbols-outlined text-sm text-[var(--text-tertiary)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
                {label}
                <span className="ml-auto material-symbols-outlined text-sm text-[var(--text-tertiary)]">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADD PLACE MODAL ──────────────────────────────────────────────── */}
      {showAddPlace && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddPlace(false)}
        >
          <div
            className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Add a Place</h2>
              <button
                onClick={() => setShowAddPlace(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPlace} className="flex flex-col gap-3">
              <input name="name" required placeholder="Place name *" className={IC} />
              <div className="grid grid-cols-2 gap-3">
                <input name="population"   type="number"        placeholder="Population"     className={IC} />
                <input name="areaSqkm"     type="number" step="0.01" placeholder="Area (km\u00b2)"       className={IC} />
                <input name="medianIncome" type="number"        placeholder="Median income"  className={IC} />
                <input name="pctElderly"   type="number" step="0.1" placeholder="% Elderly"          className={IC} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button" onClick={() => setShowAddPlace(false)}
                  className="flex-1 py-2 text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--border-strong)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={isPending}
                  className="flex-1 py-2 text-xs bg-[var(--green-500)] text-white rounded-lg hover:bg-[var(--green-400)] disabled:opacity-50 transition-colors font-semibold"
                >
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
`;

writeFileSync(OUT, code, 'utf8');
console.log(`Written ${code.length} chars to ${OUT}`);
