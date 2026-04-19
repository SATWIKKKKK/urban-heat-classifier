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
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">My Data</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Data Hub</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Everything about your city and places in one view.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/map" className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[var(--bg-base)] bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] rounded-lg hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-sm">map</span>Go to Map
          </Link>
          <Link href="/dashboard/data" className="inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="material-symbols-outlined text-sm">upload</span>Import Data
          </Link>
        </div>
      </div>

      {error && <div className="px-4 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">{error}</div>}

      {/* SECTION 1: City Overview */}
      <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">location_city</span>City Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">City</span><p className="font-semibold text-[var(--text-primary)]">{city.name}</p></div>
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">State / Country</span><p className="font-semibold text-[var(--text-primary)]">{city.state ? `${city.state}, ` : ''}{city.country}</p></div>
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Total Places</span><p className="font-semibold text-[var(--text-primary)]">{stats.totalPlaces}</p></div>
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Last Updated</span><p className="font-semibold text-[var(--text-primary)]">{new Date(city.updatedAt).toLocaleDateString()}</p></div>
          {city.lat && city.lng && (
            <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Coordinates</span><p className="text-xs text-[var(--text-secondary)]">{city.lat.toFixed(4)}, {city.lng.toFixed(4)}</p></div>
          )}
          {city.population && (
            <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Population</span><p className="font-semibold text-[var(--text-primary)]">{city.population.toLocaleString()}</p></div>
          )}
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Team Members</span><p className="font-semibold text-[var(--text-primary)]">{teamCount}</p></div>
          <div><span className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Currency</span><p className="font-semibold text-[var(--text-primary)]">{city.currency}</p></div>
        </div>
      </section>

      {/* SECTION 2: My Places */}
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">place</span>My Places
          </h2>
          <button onClick={() => setShowAddPlace(!showAddPlace)} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--green-400)]/10 text-[var(--green-400)] hover:bg-[var(--green-400)]/20 transition-colors">
            <span className="material-symbols-outlined text-sm">add</span>Add Place
          </button>
        </div>

        {/* Add Place Form */}
        {showAddPlace && (
          <form onSubmit={handleAddPlace} className="mx-5 mb-4 p-4 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] grid grid-cols-2 md:grid-cols-3 gap-3">
            <input name="name" required placeholder="Place name *" className="col-span-2 md:col-span-3 px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <input name="population" type="number" placeholder="Population" className="px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <input name="areaSqkm" type="number" step="0.01" placeholder="Area (sq km)" className="px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <input name="medianIncome" type="number" placeholder="Median Income" className="px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <input name="pctElderly" type="number" step="0.1" placeholder="% Elderly" className="px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <input name="pctChildren" type="number" step="0.1" placeholder="% Children" className="px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAddPlace(false)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg">Cancel</button>
              <button type="submit" disabled={isPending} className="px-4 py-1.5 text-xs font-semibold bg-[var(--green-400)] text-[var(--bg-base)] rounded-lg disabled:opacity-50">Save Place</button>
            </div>
          </form>
        )}

        {places.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-[var(--text-tertiary)] mb-2">add_location_alt</span>
            <p className="text-sm text-[var(--text-secondary)] mb-3">You haven&apos;t added any places yet.<br />Add your first place to start tracking heat vulnerability.</p>
            <button onClick={() => setShowAddPlace(true)} className="px-4 py-2 text-sm font-semibold bg-[var(--green-400)] text-[var(--bg-base)] rounded-lg">Add Place</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-t border-b border-[var(--border-default)] bg-[var(--bg-elevated)]">
                <th className="px-4 py-2.5 text-left text-[var(--text-tertiary)] font-medium">Place</th>
                <th className="px-4 py-2.5 text-left text-[var(--text-tertiary)] font-medium">Vulnerability</th>
                <th className="px-4 py-2.5 text-right text-[var(--text-tertiary)] font-medium">Avg Temp</th>
                <th className="px-4 py-2.5 text-right text-[var(--text-tertiary)] font-medium hidden md:table-cell">Tree Canopy</th>
                <th className="px-4 py-2.5 text-right text-[var(--text-tertiary)] font-medium hidden md:table-cell">Population</th>
                <th className="px-4 py-2.5 text-right text-[var(--text-tertiary)] font-medium">Measurements</th>
                <th className="px-4 py-2.5 text-right text-[var(--text-tertiary)] font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {places.map((p) => {
                  const vc = vulnColor(p.vulnerabilityLevel);
                  const latest = p.heatMeasurements[0];
                  const isExpanded = expandedPlace === p.id;
                  return (
                    <> 
                      <tr key={p.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors" onClick={() => setExpandedPlace(isExpanded ? null : p.id)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: vc.color }}>{isExpanded ? 'expand_more' : 'chevron_right'}</span>
                            <span className="font-medium text-[var(--text-primary)]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.vulnerabilityLevel ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ color: vc.color, backgroundColor: vc.bg }}>{p.vulnerabilityLevel}</span>
                          ) : <span className="text-[var(--text-tertiary)]">No data</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--text-primary)]">{latest ? `${latest.avgTemp.toFixed(1)}°C` : '—'}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-primary)] hidden md:table-cell">{latest?.treeCanopyPct != null ? `${latest.treeCanopyPct.toFixed(0)}%` : '—'}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-primary)] hidden md:table-cell">{p.population?.toLocaleString() ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-primary)]">{p.heatMeasurements.length}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/dashboard/map?placeId=${p.id}`} className="text-[var(--green-400)] hover:underline mr-2" onClick={(e) => e.stopPropagation()}>Map</Link>
                          <button className="text-[var(--info)] hover:underline" onClick={(e) => { e.stopPropagation(); setShowAddMeasurement(showAddMeasurement === p.id ? null : p.id); }}>+ Data</button>
                        </td>
                      </tr>
                      {/* SECTION 3: Expanded heat data */}
                      {isExpanded && (
                        <tr key={`${p.id}-expanded`}><td colSpan={7} className="px-4 py-3 bg-[var(--bg-elevated)]">
                          {showAddMeasurement === p.id && (
                            <form onSubmit={(e) => handleAddMeasurement(e, p.id)} className="mb-3 p-3 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-base)] grid grid-cols-2 md:grid-cols-4 gap-2">
                              <input name="date" type="date" required className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)]" />
                              <input name="avgTemp" type="number" step="0.1" required placeholder="Avg Temp °C *" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <input name="maxTemp" type="number" step="0.1" required placeholder="Max Temp °C *" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <input name="minTemp" type="number" step="0.1" placeholder="Min Temp °C" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <input name="treeCanopyPct" type="number" step="0.1" placeholder="Tree Canopy %" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <input name="imperviousSurfacePct" type="number" step="0.1" placeholder="Impervious Sfc %" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <input name="dataSource" placeholder="Source (e.g. MANUAL)" className="px-2 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                              <div className="flex gap-2 items-center">
                                <button type="submit" disabled={isPending} className="px-3 py-1.5 text-xs font-semibold bg-[var(--green-400)] text-[var(--bg-base)] rounded disabled:opacity-50">Save</button>
                                <button type="button" onClick={() => setShowAddMeasurement(null)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)]">Cancel</button>
                              </div>
                            </form>
                          )}
                          {p.heatMeasurements.length > 0 ? (
                            <table className="w-full text-xs">
                              <thead><tr className="border-b border-[var(--border-default)]">
                                <th className="py-1.5 text-left text-[var(--text-tertiary)] font-medium">Date</th>
                                <th className="py-1.5 text-right text-[var(--text-tertiary)] font-medium">Avg Temp</th>
                                <th className="py-1.5 text-right text-[var(--text-tertiary)] font-medium">Max Temp</th>
                                <th className="py-1.5 text-right text-[var(--text-tertiary)] font-medium hidden md:table-cell">Tree Canopy</th>
                                <th className="py-1.5 text-left text-[var(--text-tertiary)] font-medium">Source</th>
                              </tr></thead>
                              <tbody>
                                {p.heatMeasurements.slice(0, 10).map((m) => (
                                  <tr key={m.id} className="border-b border-[var(--border-default)]/50">
                                    <td className="py-1.5 text-[var(--text-primary)]">{new Date(m.date).toLocaleDateString()}</td>
                                    <td className="py-1.5 text-right text-[var(--text-primary)]">{m.avgTemp.toFixed(1)}°C</td>
                                    <td className="py-1.5 text-right text-[var(--text-primary)]">{m.maxTemp?.toFixed(1) ?? '—'}°C</td>
                                    <td className="py-1.5 text-right text-[var(--text-primary)] hidden md:table-cell">{m.treeCanopyPct != null ? `${m.treeCanopyPct.toFixed(0)}%` : '—'}</td>
                                    <td className="py-1.5"><span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-surface)] text-[var(--text-tertiary)]">{m.dataSource}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : <p className="text-xs text-[var(--text-tertiary)]">No heat measurements yet. Click &quot;+ Data&quot; to add.</p>}
                        </td></tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 4: Interventions Summary */}
      <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">construction</span>Interventions Summary
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--green-400)]">{stats.activeInterventions}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.completedInterventions}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--info)]">-{stats.totalProjectedReduction.toFixed(1)}°C</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">Projected Reduction</p>
          </div>
        </div>
      </section>

      {/* SECTION 5: Data Completeness */}
      <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">checklist</span>Data Completeness
        </h2>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-secondary)]">Overall: {completeness.overall}% complete</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--green-400)] transition-all" style={{ width: `${completeness.overall}%` }} />
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">More complete data means more accurate vulnerability scores and better Gemini report quality.</p>
        </div>
        {completeness.items.map((item) => (
          <div key={item.placeId} className="mb-2 p-3 rounded-lg bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{item.placeName}</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">{item.pct}%</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(item.checks).map(([key, val]) => (
                <span key={key} className={`text-[10px] px-1.5 py-0.5 rounded ${val ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {val ? '✓' : '✗'} {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* SECTION 6: Quick Actions */}
      <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">bolt</span>Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/dashboard/map" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border-default)] transition-colors text-center">
            <span className="material-symbols-outlined text-2xl text-[var(--green-400)]">map</span>
            <span className="text-xs font-medium text-[var(--text-primary)]">Go to Map</span>
          </Link>
          <Link href="/dashboard/interventions" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border-default)] transition-colors text-center">
            <span className="material-symbols-outlined text-2xl text-[var(--info)]">eco</span>
            <span className="text-xs font-medium text-[var(--text-primary)]">Vulnerability Report</span>
          </Link>
          <Link href="/dashboard/data" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border-default)] transition-colors text-center">
            <span className="material-symbols-outlined text-2xl text-[var(--high)]">upload</span>
            <span className="text-xs font-medium text-[var(--text-primary)]">Import Data</span>
          </Link>
          <Link href="/dashboard/scenarios" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-base)] border border-[var(--border-default)] transition-colors text-center">
            <span className="material-symbols-outlined text-2xl text-[var(--moderate)]">compare_arrows</span>
            <span className="text-xs font-medium text-[var(--text-primary)]">View Scenarios</span>
          </Link>
        </div>
      </section>

      {/* Scenarios & Reports Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Scenarios</h2>
          {scenarios.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No scenarios yet.</p> : (
            <div className="space-y-2">
              {scenarios.slice(0, 5).map((s) => (
                <Link key={s.id} href={`/dashboard/scenarios/${s.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{s.name}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{s.interventionCount} interventions</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{s.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Reports</h2>
          {reports.length === 0 ? <p className="text-xs text-[var(--text-tertiary)]">No reports generated yet.</p> : (
            <div className="space-y-2">
              {reports.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{r.title}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{new Date(r.generatedAt).toLocaleDateString()} {r.generatedBy ? `by ${r.generatedBy}` : ''}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Audit Trail */}
      {auditLogs.length > 0 && (
        <section className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recent Activity</h2>
          <div className="space-y-1">
            {auditLogs.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1.5 text-xs">
                <span className="text-[var(--text-secondary)]">{a.action.replace(/_/g, ' ')} {a.resourceType ? `(${a.resourceType})` : ''}</span>
                <span className="text-[var(--text-tertiary)]">{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
