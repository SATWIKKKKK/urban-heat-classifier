'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addPlaceAction, addHeatMeasurementAction } from '@/lib/actions';

interface CityData {
  id: string; name: string; state: string | null; country: string;
  population: number | null; areaSqkm: number | null;
  lat: number | null; lng: number | null; timezone: string | null;
  currency: string; updatedAt: string;
}
interface PlaceData {
  id: string; name: string; population: number | null; areaSqkm: number | null;
  medianIncome: number | null; pctElderly: number | null; pctChildren: number | null;
  vulnerabilityScore: number | null; vulnerabilityLevel: string | null;
  boundary: boolean;
  heatMeasurements: { id: string; date: string; avgTemp: number; maxTemp: number | null; minTemp: number | null; treeCanopyPct: number | null; imperviousSurfacePct: number | null; dataSource: string }[];
  interventions: { id: string; name: string; type: string; status: string; estimatedTempReductionC: number | null }[];
}
interface StatsData { totalPlaces: number; totalMeasurements: number; activeInterventions: number; completedInterventions: number; totalProjectedReduction: number }
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

function vulnColor(level: string | null) {
  switch (level) {
    case 'CRITICAL': return { color: '#ef4444', bg: '#ef44441a' };
    case 'HIGH': return { color: '#f97316', bg: '#f973161a' };
    case 'MODERATE': return { color: '#eab308', bg: '#eab3081a' };
    case 'LOW': return { color: '#22c55e', bg: '#22c55e1a' };
    default: return { color: '#666', bg: '#6661a' };
  }
}

export default function MyDataClient({ city, places, stats, completeness, teamCount, scenarios, reports, auditLogs, userId, cityId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedPlace, setExpandedPlace] = useState<string | null>(null);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddMeasurement, setShowAddMeasurement] = useState<string | null>(null);
  const [error, setError] = useState('');

  // â”€â”€ Computed telemetry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalArea = places.reduce((s, p) => s + (p.areaSqkm ?? 0), 0);
  const latestTemps = places.flatMap(p => p.heatMeasurements.slice(0, 1)).map(m => m.avgTemp);
  const avgTemp = latestTemps.length > 0 ? latestTemps.reduce((s, t) => s + t, 0) / latestTemps.length : null;
  const vulnerablePop = places
    .filter(p => ['CRITICAL', 'HIGH'].includes(p.vulnerabilityLevel ?? ''))
    .reduce((s, p) => s + (p.population ?? 0), 0);
  const activePlacesCount = places.filter(p => p.heatMeasurements.length > 0).length;

  // Completeness percentages
  const nPlaces = completeness.items.length;
  const tempLayerPct  = nPlaces > 0 ? Math.round(completeness.items.filter(i => i.checks.hasHeatData).length   / nPlaces * 100) : 0;
  const treeCanopyPct2 = nPlaces > 0 ? Math.round(completeness.items.filter(i => i.checks.hasTreeCanopy).length / nPlaces * 100) : 0;
  const boundaryPct   = nPlaces > 0 ? Math.round(completeness.items.filter(i => i.checks.hasBoundary).length    / nPlaces * 100) : 0;

  // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function statusLabel(level: string | null) {
    switch (level) {
      case 'CRITICAL': return 'CRITICAL';
      case 'HIGH':     return 'SEVERE';
      case 'MODERATE': return 'ELEVATED';
      case 'LOW':      return 'STABLE';
      default:         return 'UNKNOWN';
    }
  }

  function statusBadge(level: string | null): { bg: string; border: string; text: string } {
    switch (level) {
      case 'CRITICAL': return { bg: 'bg-[#5b4000]/30', border: 'border-[#f7bd48]',    text: 'text-[#f7bd48]' };
      case 'HIGH':     return { bg: 'bg-[#93000a]/30', border: 'border-[#ffb4ab]',    text: 'text-[#ffb4ab]' };
      case 'MODERATE': return { bg: 'bg-[#5b4000]/20', border: 'border-[#f7bd48]/60', text: 'text-[#f7bd48]' };
      case 'LOW':      return { bg: 'bg-[#00703f]/30', border: 'border-[#7ed99e]',    text: 'text-[#7ed99e]' };
      default:         return { bg: 'bg-zinc-900',     border: 'border-zinc-700',     text: 'text-zinc-400'  };
    }
  }

  function tempColor(level: string | null) {
    if (level === 'CRITICAL' || level === 'HIGH') return 'text-[#ffb4ab]';
    if (level === 'MODERATE') return 'text-[#f7bd48]';
    return 'text-white';
  }

  function TrendLine({ measurements, level }: { measurements: { avgTemp: number }[]; level: string | null }) {
    if (measurements.length < 2) return <span className="text-zinc-600 text-[10px]">â€”</span>;
    const temps = [...measurements].slice(0, 5).reverse();
    const min = Math.min(...temps.map(m => m.avgTemp));
    const max = Math.max(...temps.map(m => m.avgTemp));
    const range = max - min || 1;
    const pts = temps.map((m, i) => `${i * (40 / Math.max(temps.length - 1, 1))},${10 - ((m.avgTemp - min) / range) * 8}`).join(' ');
    const stroke = level === 'CRITICAL' || level === 'HIGH' ? '#ffb4ab' : level === 'MODERATE' ? '#f7bd48' : '#7ed99e';
    return (
      <svg className="inline-block w-12 h-4" viewBox="0 0 40 10" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }

  async function handleAddPlace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await addPlaceAction({
        cityId,
        name: fd.get('name') as string,
        population: fd.get('population') ? Number(fd.get('population')) : undefined,
        areaSqkm: fd.get('areaSqkm') ? Number(fd.get('areaSqkm')) : undefined,
        medianIncome: fd.get('medianIncome') ? Number(fd.get('medianIncome')) : undefined,
        pctElderly: fd.get('pctElderly') ? Number(fd.get('pctElderly')) : undefined,
        pctChildren: fd.get('pctChildren') ? Number(fd.get('pctChildren')) : undefined,
      });
      setShowAddPlace(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add place');
    }
  }

  async function handleAddMeasurement(e: React.FormEvent<HTMLFormElement>, placeId: string) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      await addHeatMeasurementAction({
        placeId,
        measurementDate: new Date(fd.get('date') as string).toISOString(),
        avgTempCelsius: Number(fd.get('avgTemp')),
        maxTempCelsius: Number(fd.get('maxTemp')),
        minTempCelsius: fd.get('minTemp') ? Number(fd.get('minTemp')) : undefined,
        treeCanopyPct: fd.get('treeCanopyPct') ? Number(fd.get('treeCanopyPct')) : undefined,
        imperviousSurfacePct: fd.get('imperviousSurfacePct') ? Number(fd.get('imperviousSurfacePct')) : undefined,
        dataSource: (fd.get('dataSource') as string) || undefined,
      });
      setShowAddMeasurement(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add measurement');
    }
  }

  return (
    <div className="flex flex-col gap-6 font-[family-name:var(--font-headline)]">
      {error && <div className="px-4 py-2 text-sm bg-[#93000a]/30 border border-[#ffb4ab] text-[#ffb4ab]">{error}</div>}

      {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <header className="flex flex-col gap-4">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-zinc-900 pb-4 gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white font-(family-name:--font-headline)">Data Hub</h1>
            <p className="text-sm text-zinc-500 mt-1">
              System Overview &amp; Metric Aggregation Â·{' '}
              <span className="text-zinc-400">{city.name}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Mini weather/stats bar */}
            <div className="flex items-center gap-px border border-zinc-800 bg-zinc-950">
              {avgTemp != null && (
                <>
                  <div className="flex flex-col px-4 py-2">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500">Avg Temp</span>
                    <span className="text-sm text-[#7ed99e]">{avgTemp.toFixed(1)}Â°C</span>
                  </div>
                  <div className="w-px h-8 bg-zinc-800" />
                </>
              )}
              <div className="flex flex-col px-4 py-2">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500">Places</span>
                <span className="text-sm text-[#9ed1bd]">{stats.totalPlaces}</span>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div className="flex flex-col px-4 py-2">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500">Country</span>
                <span className="text-sm text-[#9ed1bd]">{city.country}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 bg-[#9af6b8]" />
              <span className="text-[11px] text-[#9af6b8] uppercase tracking-wider">System Active</span>
            </div>
          </div>
        </div>

        {/* Telemetry cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800">
          <div className="bg-[#0e0e0e] p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Total Monitored Area</span>
            <span className="text-xl text-white">
              {totalArea > 0 ? `${totalArea.toLocaleString()} kmÂ²` : `${stats.totalPlaces} places`}
            </span>
          </div>
          <div className="bg-[#0e0e0e] p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Temp Delta</span>
            <span className="text-xl text-[#ffb4ab]">{avgTemp != null ? `+${avgTemp.toFixed(1)}Â°C` : 'â€”'}</span>
          </div>
          <div className="bg-[#0e0e0e] p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Vulnerable Pop.</span>
            <span className="text-xl text-[#f7bd48]">{vulnerablePop > 0 ? vulnerablePop.toLocaleString() : 'â€”'}</span>
          </div>
          <div className="bg-[#0e0e0e] p-4 flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Active Sensors</span>
            <span className="text-xl text-[#7ed99e]">{activePlacesCount} / {stats.totalPlaces}</span>
          </div>
        </div>

        {/* Place Array Health */}
        {places.length > 0 && (
          <div className="border border-zinc-900 bg-[#0e0e0e] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h2 className="text-[11px] uppercase tracking-widest text-white font-(family-name:--font-headline)">Place Array Health</h2>
              <span className="text-xs text-[#7ed99e]">
                ACTIVE: {activePlacesCount} | UNMEASURED: {stats.totalPlaces - activePlacesCount}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
              {places.slice(0, 16).map(p => {
                const st = statusBadge(p.vulnerabilityLevel);
                const active = p.heatMeasurements.length > 0;
                return (
                  <div
                    key={p.id}
                    className={`min-w-0 flex items-center gap-2 border p-1.5 ${active ? st.border + '/40' : 'border-zinc-800'}`}
                    title={p.name}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 ${p.vulnerabilityLevel === 'CRITICAL' ? 'bg-[#f7bd48]' : active ? 'bg-[#9af6b8]' : 'bg-zinc-700'}`} />
                    <span className="min-w-0 flex-1 text-[10px] text-white leading-tight wrap-break-word">
                      {p.name.toUpperCase().replace(/\s+/g, '-')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* â”€â”€ MAIN GRID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left 8 cols â€” My Places Directory */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <h2 className="text-[11px] uppercase tracking-widest text-white font-(family-name:--font-headline)">My Places Directory</h2>
            <button
              onClick={() => setShowAddPlace(!showAddPlace)}
              className="text-[11px] text-[#9ed1bd] hover:text-white uppercase border border-zinc-800 px-3 py-1 hover:border-zinc-700"
            >
              + Add Place
            </button>
          </div>

          {/* Add Place Form */}
          {showAddPlace && (
            <form
              onSubmit={handleAddPlace}
              className="p-4 border border-zinc-800 bg-zinc-950 grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              <input name="name" required placeholder="Place name *"
                className="col-span-2 md:col-span-3 px-3 py-2 bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600" />
              <input name="population" type="number" placeholder="Population"
                className="px-3 py-2 bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
              <input name="areaSqkm" type="number" step="0.01" placeholder="Area kmÂ²"
                className="px-3 py-2 bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
              <input name="medianIncome" type="number" placeholder="Median Income"
                className="px-3 py-2 bg-black border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none" />
              <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddPlace(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800">Cancel</button>
                <button type="submit" disabled={isPending}
                  className="px-4 py-1.5 text-xs bg-[#22c55e] text-black disabled:opacity-50">Save Place</button>
              </div>
            </form>
          )}

          {/* Places table */}
          <div className="border border-zinc-900 bg-[#0e0e0e] overflow-hidden">
            {places.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-zinc-500 mb-4">No places added yet.</p>
                <button onClick={() => setShowAddPlace(true)}
                  className="text-xs bg-[#22c55e] text-black px-4 py-2">Add Place</button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-950 border-b border-zinc-900">
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase">Location</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase">Status</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase text-center">Trend 24H</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase text-right">Avg Temp</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase text-right hidden md:table-cell">Canopy %</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase text-right hidden md:table-cell">Population</th>
                    <th className="text-[10px] text-zinc-500 font-normal py-2 px-4 uppercase text-center">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map(p => {
                    const st = statusBadge(p.vulnerabilityLevel);
                    const latest = p.heatMeasurements[0];
                    const isExp = expandedPlace === p.id;
                    return (
                      <>
                        <tr
                          key={p.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/50 cursor-pointer h-9"
                          onClick={() => setExpandedPlace(isExp ? null : p.id)}
                        >
                          <td className="py-1 px-4 text-white">{p.name}</td>
                          <td className="py-1 px-4">
                            <span className={`inline-block ${st.bg} border ${st.border} ${st.text} px-2 py-0.5 text-[9px] uppercase font-bold tracking-widest`}>
                              {statusLabel(p.vulnerabilityLevel)}
                            </span>
                          </td>
                          <td className="py-1 px-4 text-center">
                            <TrendLine measurements={p.heatMeasurements} level={p.vulnerabilityLevel} />
                          </td>
                          <td className={`py-1 px-4 text-right ${tempColor(p.vulnerabilityLevel)}`}>
                            {latest ? `${latest.avgTemp.toFixed(1)}Â°C` : 'â€”'}
                          </td>
                          <td className="py-1 px-4 text-right text-white hidden md:table-cell">
                            {latest?.treeCanopyPct != null ? `${latest.treeCanopyPct.toFixed(0)}%` : 'â€”'}
                          </td>
                          <td className="py-1 px-4 text-right text-white hidden md:table-cell">
                            {p.population?.toLocaleString() ?? 'â€”'}
                          </td>
                          <td className="py-1 px-4 text-center">
                            <Link
                              href={`/dashboard/map?placeId=${p.id}`}
                              className="text-zinc-600 hover:text-[#9ed1bd]"
                              onClick={e => e.stopPropagation()}
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                            </Link>
                          </td>
                        </tr>
                        {isExp && (
                          <tr key={`${p.id}-exp`}>
                            <td colSpan={7} className="px-4 py-3 bg-zinc-950 border-b border-zinc-900">
                              {showAddMeasurement === p.id && (
                                <form
                                  onSubmit={e => handleAddMeasurement(e, p.id)}
                                  className="mb-3 p-3 border border-zinc-800 bg-black grid grid-cols-2 md:grid-cols-4 gap-2"
                                >
                                  <input name="date" type="date" required
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none" />
                                  <input name="avgTemp" type="number" step="0.1" required placeholder="Avg Temp Â°C *"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <input name="maxTemp" type="number" step="0.1" required placeholder="Max Temp Â°C *"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <input name="minTemp" type="number" step="0.1" placeholder="Min Temp Â°C"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <input name="treeCanopyPct" type="number" step="0.1" placeholder="Tree Canopy %"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious Sfc %"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <input name="dataSource" placeholder="Source"
                                    className="px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                                  <div className="flex gap-2 items-center">
                                    <button type="submit" disabled={isPending}
                                      className="px-3 py-1.5 text-xs bg-[#22c55e] text-black disabled:opacity-50">Save</button>
                                    <button type="button" onClick={() => setShowAddMeasurement(null)}
                                      className="px-3 py-1.5 text-xs text-zinc-500">Cancel</button>
                                  </div>
                                </form>
                              )}
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-zinc-500 uppercase">
                                  {p.heatMeasurements.length} measurements Â· {p.interventions.length} interventions
                                </span>
                                <button
                                  onClick={() => setShowAddMeasurement(showAddMeasurement === p.id ? null : p.id)}
                                  className="text-[10px] text-[#9ed1bd] hover:text-white border border-zinc-800 px-2 py-0.5"
                                >
                                  + Add Data
                                </button>
                              </div>
                              {p.heatMeasurements.length > 0 ? (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-800">
                                      <th className="py-1 text-left text-zinc-500 font-normal">Date</th>
                                      <th className="py-1 text-right text-zinc-500 font-normal">Avg Â°C</th>
                                      <th className="py-1 text-right text-zinc-500 font-normal">Max Â°C</th>
                                      <th className="py-1 text-right text-zinc-500 font-normal hidden md:table-cell">Canopy</th>
                                      <th className="py-1 text-left text-zinc-500 font-normal">Source</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {p.heatMeasurements.slice(0, 8).map(m => (
                                      <tr key={m.id} className="border-b border-zinc-900/50">
                                        <td className="py-1 text-white">{new Date(m.date).toLocaleDateString()}</td>
                                        <td className="py-1 text-right text-white">{m.avgTemp.toFixed(1)}</td>
                                        <td className="py-1 text-right text-white">{m.maxTemp?.toFixed(1) ?? 'â€”'}</td>
                                        <td className="py-1 text-right text-white hidden md:table-cell">
                                          {m.treeCanopyPct != null ? `${m.treeCanopyPct.toFixed(0)}%` : 'â€”'}
                                        </td>
                                        <td className="py-1">
                                          <span className="px-1.5 py-0.5 bg-zinc-900 text-zinc-500 text-[10px]">{m.dataSource}</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="text-[11px] text-zinc-500">No measurements yet.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right 4 cols â€” Metrics + Completeness */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Intervention Metrics */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[11px] uppercase tracking-widest text-white border-b border-zinc-900 pb-2">
              Intervention Metrics
            </h2>
            <div className="grid grid-cols-2 gap-px bg-zinc-800">
              <div className="bg-[#0e0e0e] p-4 flex flex-col gap-1 border-t-2 border-[#1b4d3e]">
                <span className="text-[10px] text-zinc-500 uppercase">Active Projects</span>
                <span className="text-2xl text-[#9ed1bd]">{stats.activeInterventions}</span>
              </div>
              <div className="bg-[#0e0e0e] p-4 flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 uppercase">Completed YTD</span>
                <span className="text-2xl text-white">{stats.completedInterventions}</span>
              </div>
              <div className="bg-[#0e0e0e] p-4 flex flex-col gap-1 col-span-2">
                <span className="text-[10px] text-zinc-500 uppercase">Projected Temp Reduction</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-3xl text-[#7ed99e]">
                    {stats.totalProjectedReduction > 0 ? `-${stats.totalProjectedReduction.toFixed(1)}Â°C` : 'â€”'}
                  </span>
                  <span className="text-sm text-zinc-500 mb-1">if implemented</span>
                </div>
              </div>

              {/* Scenarios bar chart */}
              <div className="bg-[#0e0e0e] p-4 flex flex-col gap-2 col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 uppercase">Scenarios by Status</span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-zinc-700 inline-block" />
                      <span className="text-[8px] text-zinc-500">Draft</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-[#9ed1bd] inline-block" />
                      <span className="text-[8px] text-zinc-500">Active</span>
                    </div>
                  </div>
                </div>
                <div className="flex h-14 items-end gap-2 mt-2">
                  {scenarios.length > 0 ? (
                    (['DRAFT', 'APPROVED', 'PENDING_REVIEW', 'REJECTED'] as const).map((s, idx) => {
                      const count = scenarios.filter(sc => sc.status === s).length;
                      const pct = scenarios.length > 0 ? count / scenarios.length : 0;
                      const colors = ['bg-zinc-700', 'bg-[#9ed1bd]', 'bg-[#f7bd48]', 'bg-[#ffb4ab]'] as const;
                      return (
                        <div key={s} className="flex items-end h-full flex-1" title={`${s}: ${count}`}>
                          <div className={`w-full ${colors[idx]} min-h-[2px]`} style={{ height: `${Math.max(pct * 100, 4)}%` }} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex w-full items-center justify-center">
                      <span className="text-[10px] text-zinc-600">No scenarios yet</span>
                    </div>
                  )}
                </div>
                {scenarios.length > 0 && (
                  <div className="flex justify-around text-[9px] text-zinc-500">
                    {['DRAFT', 'APRVD', 'REVW', 'RJCT'].map(s => <span key={s}>{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Data Completeness */}
          <div className="flex flex-col gap-4">
            <h2 className="text-[11px] uppercase tracking-widest text-white border-b border-zinc-900 pb-2">
              Data Completeness
            </h2>
            <div className="flex flex-col gap-4 border border-zinc-900 bg-[#0e0e0e] p-4">
              {([
                { label: 'Surface Temp Layer',      pct: tempLayerPct,           color: '#7ed99e' },
                { label: 'Tree Canopy Inventory',   pct: treeCanopyPct2,          color: '#9ed1bd' },
                { label: 'Social Vulnerability Idx', pct: completeness.overall,  color: '#f7bd48' },
                { label: 'Building Footprints',     pct: boundaryPct,            color: '#ffb4ab' },
              ] as const).map(item => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] text-white uppercase">{item.label}</span>
                    <span className="text-xs" style={{ color: item.color }}>{item.pct}%</span>
                  </div>
                  <div className="w-full h-1 bg-zinc-900">
                    <div className="h-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Reports */}
          {reports.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[11px] uppercase tracking-widest text-white border-b border-zinc-900 pb-2">
                Recent Reports
              </h2>
              <div className="flex flex-col gap-1">
                {reports.slice(0, 4).map(r => (
                  <div key={r.id} className="flex justify-between items-center px-3 py-2 border border-zinc-900 bg-[#0e0e0e]">
                    <span className="text-[11px] text-white truncate max-w-[60%]">{r.title}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(r.generatedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Scenarios */}
          {scenarios.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-[11px] uppercase tracking-widest text-white border-b border-zinc-900 pb-2">
                Recent Scenarios
              </h2>
              <div className="flex flex-col gap-1">
                {scenarios.slice(0, 4).map(s => (
                  <Link
                    key={s.id}
                    href={`/dashboard/scenarios/${s.id}`}
                    className="flex justify-between items-center px-3 py-2 border border-zinc-900 bg-[#0e0e0e] hover:border-zinc-700"
                  >
                    <span className="text-[11px] text-white truncate max-w-[60%]">{s.name}</span>
                    <span className="text-[10px] text-zinc-500">{s.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ QUICK ACTIONS FOOTER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="border-t border-zinc-900 pt-4 flex flex-wrap gap-3">
        <Link
          href="/dashboard/map"
          className="bg-[#1b4d3e] text-white text-[11px] px-6 py-2 uppercase tracking-widest hover:bg-[#22c55e]/20 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">map</span>Go to Map
        </Link>
        <Link
          href="/dashboard/reports"
          className="bg-transparent border border-zinc-800 text-white text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[#7ed99e] hover:text-[#7ed99e] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">summarize</span>Reports
        </Link>
        <Link
          href="/dashboard/data"
          className="bg-transparent border border-zinc-800 text-white text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[#7ed99e] hover:text-[#7ed99e] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>Import Data
        </Link>
        <Link
          href="/dashboard/scenarios"
          className="ml-auto bg-transparent border border-zinc-800 text-white text-[11px] px-6 py-2 uppercase tracking-widest hover:border-[#7ed99e] hover:text-[#7ed99e] transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">science</span>View Scenarios
        </Link>
      </footer>
    </div>
  );
}


