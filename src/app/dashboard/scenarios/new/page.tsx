'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type ScenarioIntervention = {
  id: string;
  name: string;
  type: string;
  status: string;
  estimatedCostUsd: number | null;
  estimatedTempReductionC: number | null;
  neighborhood?: { name: string | null } | null;
};

function estimateLivesSaved(totalProjectedTempReductionC: number) {
  return Math.round(totalProjectedTempReductionC * 12.8);
}

function estimateCo2Reduction(totalProjectedTempReductionC: number) {
  return Number((totalProjectedTempReductionC * 6.9).toFixed(1));
}

export default function NewScenarioPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const cityId = session?.user?.cityId;
  const userId = session?.user?.id;

  const [name, setName] = useState('Summer 2025 Emergency Cooling Plan');
  const [description, setDescription] = useState(
    'Addresses the most critical neighborhoods with highest ROI interventions first.'
  );
  const [priority, setPriority] = useState('IMMEDIATE');
  const [interventions, setInterventions] = useState<ScenarioIntervention[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasRunSimulation, setHasRunSimulation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadInterventions() {
      if (!cityId || hasLoaded) {
        return;
      }

      const response = await fetch(`/api/interventions?cityId=${cityId}&includeProposed=true`);
      const json = await response.json();
      setInterventions((json.interventions || []) as ScenarioIntervention[]);
      setHasLoaded(true);
    }

    void loadInterventions();
  }, [cityId, hasLoaded]);

  const selectedInterventions = interventions.filter((intervention) => selectedIds.includes(intervention.id));
  const totalEstimatedCostUsd = selectedInterventions.reduce(
    (sum, intervention) => sum + (intervention.estimatedCostUsd || 0),
    0
  );
  const totalProjectedTempReductionC = selectedInterventions.reduce(
    (sum, intervention) => sum + (intervention.estimatedTempReductionC || 0),
    0
  );
  const totalProjectedLivesSaved = estimateLivesSaved(totalProjectedTempReductionC);
  const projectedCo2ReductionTons = estimateCo2Reduction(totalProjectedTempReductionC);

  const neighborhoodResults = selectedInterventions.map((intervention, index) => ({
    neighborhood: intervention.neighborhood?.name || `Priority Area ${index + 1}`,
    reductionCelsius: intervention.estimatedTempReductionC || 0,
    livesSaved: Math.max(1, Math.round((intervention.estimatedTempReductionC || 0) * 7.5)),
  }));

  async function handleSubmit() {
    if (!cityId || !userId) {
      setError('Your session is not ready. Please sign in again.');
      return;
    }

    if (!name.trim() || selectedIds.length === 0) {
      setError('Add a scenario name and select at least one intervention.');
      return;
    }

    if (!hasRunSimulation) {
      setError('Run the simulation before creating the scenario.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          name,
          description,
          createdById: userId,
          interventionIds: selectedIds,
          priority,
          totalEstimatedCostUsd,
          totalProjectedTempReductionC,
          totalProjectedLivesSaved,
          projectedCo2ReductionTons,
          simulationSummary: {
            averageTempReductionCelsius: totalProjectedTempReductionC,
            livesProtectedPerSummer: totalProjectedLivesSaved,
            projectedCo2ReductionTons,
            costPerLifeProtected:
              totalProjectedLivesSaved > 0
                ? Math.round(totalEstimatedCostUsd / totalProjectedLivesSaved)
                : null,
          },
          neighborhoodResults,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.scenario?.id) {
        throw new Error(json.error || 'Failed to create scenario');
      }

      router.push(`/dashboard/scenarios/${json.scenario.id}`);
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to create scenario';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleIntervention(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Create New Scenario</h1>
        <p className="mt-1 text-sm text-[#6d758c]">
          Group high-impact interventions, run the simulation, and submit the package for approval.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="glass-card rounded-2xl p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#dee5ff]">Scenario name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#69f6b8]/50 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[#dee5ff]">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#69f6b8]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#dee5ff]">Priority</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-[#69f6b8]/50 focus:outline-none"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="SHORT_TERM">Short Term</option>
                <option value="LONG_TERM">Long Term</option>
              </select>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Available interventions</h2>
              <span className="text-sm text-[#a3aac4]">{selectedIds.length} selected</span>
            </div>
            <div className="grid gap-3">
              {interventions.map((intervention) => {
                const checked = selectedIds.includes(intervention.id);
                return (
                  <label
                    key={intervention.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition ${
                      checked ? 'border-[#69f6b8]/40 bg-[#69f6b8]/10' : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIntervention(intervention.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-white">{intervention.name}</div>
                          <div className="text-sm text-[#a3aac4]">
                            {intervention.neighborhood?.name || 'City-wide'} · {intervention.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold text-[#69f6b8]">
                            {intervention.estimatedTempReductionC != null
                              ? `-${intervention.estimatedTempReductionC.toFixed(1)}°C`
                              : '—'}
                          </div>
                          <div className="text-[#a3aac4]">
                            {intervention.estimatedCostUsd != null
                              ? `$${intervention.estimatedCostUsd.toLocaleString()}`
                              : 'Cost pending'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white">Simulation Results</h2>
          <p className="mt-1 text-sm text-[#a3aac4]">Use the selected interventions to preview city-wide impact.</p>

          <button
            type="button"
            onClick={() => setHasRunSimulation(true)}
            disabled={selectedIds.length === 0}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#699cff] to-[#4a7aff] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 btn-shine"
          >
            Run Simulation
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/5 p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Budget</div>
              <div className="mt-2 text-2xl font-bold text-white">${totalEstimatedCostUsd.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Cooling</div>
              <div className="mt-2 text-2xl font-bold text-[#69f6b8]">
                -{totalProjectedTempReductionC.toFixed(1)}°C
              </div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Lives Protected</div>
              <div className="mt-2 text-2xl font-bold text-white">{totalProjectedLivesSaved}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/5 p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">CO2 Reduced</div>
              <div className="mt-2 text-2xl font-bold text-white">{projectedCo2ReductionTons}t</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white/5 border border-white/5 p-4 text-sm text-[#a3aac4]">
            {hasRunSimulation
              ? `The selected package is projected to protect ${totalProjectedLivesSaved} residents per summer at a cost of $${
                  totalProjectedLivesSaved > 0
                    ? Math.round(totalEstimatedCostUsd / totalProjectedLivesSaved).toLocaleString()
                    : '0'
                } per life protected.`
              : 'Run the simulation to unlock submission.'}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#69f6b8] to-[#06b77f] px-4 py-3 text-sm font-bold text-[#002919] disabled:opacity-50 btn-shine"
          >
            {submitting ? 'Creating Scenario...' : 'Create Scenario'}
          </button>
        </section>
      </div>
    </div>
  );
}