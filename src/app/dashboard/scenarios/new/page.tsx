'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// ── Strategy definitions ────────────────────────────────────────────────────

const STRATEGIES = [
  { key: 'TREE_PLANTING', label: 'Tree Planting', icon: 'park', desc: 'Plant native trees to create shade canopy and reduce surface temperatures through evapotranspiration.', color: '#22c55e' },
  { key: 'GREEN_ROOF', label: 'Green Roofs', icon: 'roofing', desc: 'Install vegetated roof systems on buildings to insulate and cool urban surfaces.', color: '#10b981' },
  { key: 'COOL_PAVEMENT', label: 'Cool Pavement', icon: 'road', desc: 'Apply reflective coatings to roads and parking lots to reduce heat absorption.', color: '#06b6d4' },
  { key: 'COOL_ROOF', label: 'Cool Roofs', icon: 'wb_sunny', desc: 'High-albedo roof coatings that reflect sunlight and reduce building heat gain.', color: '#0ea5e9' },
  { key: 'PERMEABLE_PAVEMENT', label: 'Permeable Surfaces', icon: 'water_drop', desc: 'Replace impervious surfaces with permeable materials that allow water infiltration and cooling.', color: '#3b82f6' },
  { key: 'URBAN_GARDEN', label: 'Urban Gardens', icon: 'yard', desc: 'Create community gardens and green spaces that cool surrounding areas.', color: '#84cc16' },
  { key: 'MIST_STATION', label: 'Misting Stations', icon: 'air', desc: 'Install public misting systems for immediate pedestrian cooling in high-traffic areas.', color: '#8b5cf6' },
  { key: 'SHADE_STRUCTURE', label: 'Shade Structures', icon: 'deck', desc: 'Build permanent shade canopies over walkways, bus stops, and public spaces.', color: '#f59e0b' },
] as const;

type StrategyKey = typeof STRATEGIES[number]['key'];

// ── Quick simulation estimate (client-side) ─────────────────────────────────

function quickEstimate(selected: StrategyKey[], population: number, baselineTemp: number) {
  const coeffs: Record<string, number> = {
    TREE_PLANTING: 0.4, GREEN_ROOF: 0.3, COOL_PAVEMENT: 0.2,
    COOL_ROOF: 0.35, PERMEABLE_PAVEMENT: 0.15, URBAN_GARDEN: 0.25,
    MIST_STATION: 0.1, SHADE_STRUCTURE: 0.2,
  };
  const rawReduction = selected.reduce((sum, s) => sum + (coeffs[s] ?? 0.1), 0);
  const tempReduction = 5 * (1 - Math.exp(-rawReduction / 5));
  const excessBefore = Math.max(0, baselineTemp - 20) * 0.015 * (population / 100000);
  const excessAfter = Math.max(0, baselineTemp - tempReduction - 20) * 0.015 * (population / 100000);
  const livesSaved = Math.max(0, excessBefore - excessAfter);
  return { tempReduction: Math.round(tempReduction * 100) / 100, livesSaved: Math.round(livesSaved * 10) / 10 };
}

// ── Component ───────────────────────────────────────────────────────────────

function ScenarioBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  // Place data (from query params or from DB)
  const [place, setPlace] = useState<{
    id?: string;
    name: string;
    cityName: string;
    stateName?: string;
    countryName: string;
    countryCode: string;
    lat: number;
    lng: number;
    population?: number;
    baselineTempC?: number;
    treeCanopyPct?: number;
    imperviousSurfacePct?: number;
    vulnerabilityScore?: number;
    vulnerabilityLevel?: string;
  } | null>(null);

  // User configuration
  const [selectedStrategies, setSelectedStrategies] = useState<StrategyKey[]>([]);
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('12');
  const [priority, setPriority] = useState<string>('HEALTH');

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [error, setError] = useState('');

  // Load place from query params
  useEffect(() => {
    const placeId = searchParams.get('placeId');
    const placeName = searchParams.get('placeName');

    if (placeId) {
      fetch(`/api/places/${placeId}`, { cache: 'no-store' })
        .then(r => {
          if (!r.ok) throw new Error('Failed to fetch place');
          return r.json();
        })
        .then(data => {
          if (data && !data.error) {
            setPlace({
              id: data.id,
              name: data.name,
              cityName: data.city?.name ?? '',
              stateName: data.city?.state,
              countryName: data.city?.country ?? 'India',
              countryCode: data.city?.countryCode ?? 'in',
              lat: data.lat ?? data.city?.lat ?? 0,
              lng: data.lng ?? data.city?.lng ?? 0,
              population: data.population,
              baselineTempC: data.avgSurfaceTempC,
              treeCanopyPct: data.treeCanopyPct,
              imperviousSurfacePct: data.imperviousSurfacePct,
              vulnerabilityScore: data.vulnerabilityScore,
              vulnerabilityLevel: data.vulnerabilityLevel,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load place:", err);
        });
    } else if (placeName) {
      setPlace({
        name: placeName,
        cityName: searchParams.get('cityName') ?? placeName,
        stateName: searchParams.get('stateName') ?? undefined,
        countryName: searchParams.get('countryName') ?? 'Unknown',
        countryCode: searchParams.get('countryCode') ?? 'us',
        lat: parseFloat(searchParams.get('lat') ?? '0'),
        lng: parseFloat(searchParams.get('lng') ?? '0'),
        population: searchParams.get('population') ? parseInt(searchParams.get('population')!) : undefined,
        baselineTempC: searchParams.get('baselineTempC') ? parseFloat(searchParams.get('baselineTempC')!) : undefined,
      });
    }
  }, [searchParams, session]);

  const toggleStrategy = useCallback((key: StrategyKey) => {
    setSelectedStrategies(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );
  }, []);

  const estimate = useMemo(() => {
    if (!selectedStrategies.length) return null;
    return quickEstimate(
      selectedStrategies,
      place?.population ?? 100000,
      place?.baselineTempC ?? 35,
    );
  }, [selectedStrategies, place]);

  const STEPS = [
    'Analyzing location data...',
    'Evaluating selected strategies...',
    'Running climate simulation...',
    'Generating Scenario (Recommended)...',
    'Building implementation plan...',
    'Calculating cost projections...',
    'Finalizing report...',
  ];

  const handleGenerate = async () => {
    if (!place || !selectedStrategies.length) return;
    setGenerating(true);
    setGenerationStep(0);
    setError('');

    const stepInterval = setInterval(() => {
      setGenerationStep(prev => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const res = await fetch('/api/scenarios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: place.id,
          placeName: place.name,
          cityName: place.cityName,
          stateName: place.stateName,
          countryName: place.countryName,
          countryCode: place.countryCode,
          latitude: place.lat,
          longitude: place.lng,
          population: place.population,
          baselineTempC: place.baselineTempC,
          treeCanopyPct: place.treeCanopyPct,
          imperviousSurfacePct: place.imperviousSurfacePct,
          vulnerabilityScore: place.vulnerabilityScore,
          vulnerabilityLevel: place.vulnerabilityLevel,
          selectedStrategies,
          budgetLocal: budget ? parseFloat(budget) : null,
          timelineMonths: timeline ? parseInt(timeline) : null,
          priority: priority || null,
        }),
      });

      clearInterval(stepInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Generation failed');
      }

      const data = await res.json();
      if (data.scenarios?.[0]?.id) {
        router.push(`/dashboard/scenarios/${data.scenarios[0].id}/report`);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setGenerating(false);
    }
  };

  // ── Generation overlay ──────────────────────────────────────────────────

  if (generating) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090b] flex items-center justify-center">
        <div className="max-w-md w-full px-6 text-center">
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-[#22c55e] animate-pulse">auto_awesome</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Generating Your Scenario</h2>
            <p className="text-sm text-neutral-400">Our AI is analyzing your location and building a complete plan...</p>
          </div>

          <div className="space-y-3 text-left mb-8">
            {STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i <= generationStep ? 'opacity-100' : 'opacity-20'}`}>
                {i < generationStep ? (
                  <span className="material-symbols-outlined text-[#22c55e] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                ) : i === generationStep ? (
                  <div className="w-5 h-5 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border border-white/10" />
                )}
                <span className={`text-sm ${i <= generationStep ? 'text-white' : 'text-neutral-600'}`}>{step}</span>
              </div>
            ))}
          </div>

          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-[#22c55e] rounded-full transition-all duration-700" style={{ width: `${((generationStep + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Main builder ───────────────────────────────────────────────────────-

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/scenarios" className="text-neutral-500 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-white">Build Scenario</h1>
              {place && <p className="text-[11px] text-neutral-500">{place.name}, {place.cityName}</p>}
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!place || !selectedStrategies.length}
            className="px-5 h-9 text-sm font-semibold bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
           
            Generate Plan
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>{error}
            <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-400"><span className="material-symbols-outlined text-base">close</span></button>
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {place ? (
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#22c55e]">location_on</span>
                    {place.name}
                  </h2>
                  {place.vulnerabilityLevel && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded px-2 py-0.5 ${
                      place.vulnerabilityLevel === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      place.vulnerabilityLevel === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      place.vulnerabilityLevel === 'MODERATE' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                      'bg-green-500/10 text-green-400 border border-green-500/20'
                    }`}>{place.vulnerabilityLevel}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {place.population != null && <div><span className="text-neutral-500 block">Population</span><span className="text-white font-medium">{place.population.toLocaleString()}</span></div>}
                  {place.baselineTempC != null && <div><span className="text-neutral-500 block">Avg Temp</span><span className="text-white font-medium">{place.baselineTempC}°C</span></div>}
                  {place.treeCanopyPct != null && <div><span className="text-neutral-500 block">Tree Canopy</span><span className="text-[#22c55e] font-medium">{place.treeCanopyPct}%</span></div>}
                  {place.imperviousSurfacePct != null && <div><span className="text-neutral-500 block">Impervious</span><span className="text-white font-medium">{place.imperviousSurfacePct}%</span></div>}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-neutral-600 mb-2">location_searching</span>
                <p className="text-sm text-neutral-400 mb-3">No place selected. Choose a location to build a scenario for.</p>
                <Link href="/dashboard/map" className="text-sm font-medium text-[#22c55e] hover:underline">Search on Map</Link>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-white mb-1">Select Strategies</h2>
              <p className="text-xs text-neutral-500 mb-4">Choose the heat mitigation strategies to include in your scenario.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {STRATEGIES.map(s => {
                  const active = selectedStrategies.includes(s.key);
                  return (
                    <button key={s.key} type="button" onClick={() => toggleStrategy(s.key)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        active
                          ? 'border-[#22c55e]/40 bg-[#22c55e]/5 ring-1 ring-[#22c55e]/20'
                          : 'border-white/[0.06] bg-[#111113] hover:border-white/[0.12] hover:bg-white/[0.02]'
                      }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-lg" style={{ color: active ? s.color : '#525252', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{s.icon}</span>
                        <span className={`text-sm font-medium ${active ? 'text-white' : 'text-neutral-300'}`}>{s.label}</span>
                        {active && <span className="material-symbols-outlined text-[#22c55e] text-base ml-auto" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Budget (optional)</label>
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 50000000"
                  className="w-full h-10 px-3 text-sm text-white bg-[#111113] border border-white/[0.08] rounded-lg focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none transition-colors placeholder:text-neutral-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Timeline (months)</label>
                <input type="number" value={timeline} onChange={e => setTimeline(e.target.value)} placeholder="12"
                  className="w-full h-10 px-3 text-sm text-white bg-[#111113] border border-white/[0.08] rounded-lg focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none transition-colors placeholder:text-neutral-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full h-10 px-3 text-sm text-white bg-[#111113] border border-white/[0.08] rounded-lg focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 outline-none transition-colors">
                  <option value="HEALTH">Health Impact</option>
                  <option value="ENVIRONMENT">Environmental</option>
                  <option value="COST_EFFECTIVE">Cost Effective</option>
                  <option value="EQUITY">Equity Focused</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right column: Preview */}
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Live Preview</h3>
              {selectedStrategies.length === 0 ? (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-2xl text-neutral-700 mb-2">touch_app</span>
                  <p className="text-xs text-neutral-600">Select strategies to see impact estimates</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[#09090b] p-3 text-center">
                      <div className="text-lg font-bold text-[#22c55e]">-{estimate?.tempReduction ?? 0}°C</div>
                      <div className="text-[10px] text-neutral-500">Temp Reduction</div>
                    </div>
                    <div className="rounded-lg bg-[#09090b] p-3 text-center">
                      <div className="text-lg font-bold text-white">{estimate?.livesSaved ?? 0}</div>
                      <div className="text-[10px] text-neutral-500">Lives Saved/yr</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-medium uppercase tracking-wider text-neutral-600 mb-2">Selected ({selectedStrategies.length})</h4>
                    <div className="space-y-1.5">
                      {selectedStrategies.map(key => {
                        const s = STRATEGIES.find(x => x.key === key)!;
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs">
                            <span className="material-symbols-outlined text-sm" style={{ color: s.color, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                            <span className="text-neutral-300">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] text-neutral-600 leading-relaxed">
                      These are quick estimates. The AI-generated plan will include detailed projections with local cost analysis, implementation timeline, and monitoring recommendations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={!place || !selectedStrategies.length}
              className="w-full lg:hidden px-5 h-12 text-sm font-semibold bg-[#22c55e] text-white rounded-xl hover:bg-[#16a34a] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
           
              Generate Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioBuilderSkeleton() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">Loading scenario builder…</p>
      </div>
    </div>
  );
}

export default function ScenarioBuilderPage() {
  return (
    <Suspense fallback={<ScenarioBuilderSkeleton />}>
      <ScenarioBuilderContent />
    </Suspense>
  );
}