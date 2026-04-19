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
  place?: { name: string | null } | null;
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
    'Addresses the most critical places with highest ROI interventions first.'
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

      try {
        const response = await fetch(`/api/interventions?cityId=${cityId}&includeProposed=true`);
        if (!response.ok) throw new Error('Failed to load interventions');
        const json = await response.json();
        setInterventions((json.interventions || []) as ScenarioIntervention[]);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Could not load interventions';
        setError(message);
        setInterventions([]);
      } finally {
        setHasLoaded(true);
      }
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

  const placeResults = selectedInterventions.map((intervention, index) => ({
    place: intervention.place?.name || `Priority Area ${index + 1}`,
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
          placeResults,
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
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Group high-impact interventions, run the simulation, and submit the package for approval.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Scenario name</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-[var(--text-primary)]">Priority</label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none"
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
              <span className="text-sm text-[var(--text-secondary)]">{selectedIds.length} selected</span>
            </div>
            <div className="grid gap-3">
              {interventions.map((intervention) => {
                const checked = selectedIds.includes(intervention.id);
                return (
                  <label
                    key={intervention.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 transition ${
                      checked ? 'border-[var(--green-400)]/40 bg-[var(--green-400)]/10' : 'border-[var(--border-strong)] bg-[var(--bg-elevated)]'
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
                          <div className="text-sm text-[var(--text-secondary)]">
                            {intervention.place?.name || 'City-wide'} · {intervention.type.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-semibold text-[var(--green-400)]">
                            {intervention.estimatedTempReductionC != null
                              ? `-${intervention.estimatedTempReductionC.toFixed(1)}°C`
                              : '—'}
                          </div>
                          <div className="text-[var(--text-secondary)]">
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

        <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-white">Simulation Results</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Use the selected interventions to preview city-wide impact.</p>

          <button
            type="button"
            onClick={() => setHasRunSimulation(true)}
            disabled={selectedIds.length === 0}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-[var(--info)] to-[#4a7aff] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 "
          >
            Run Simulation
          </button>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Budget</div>
              <div className="mt-2 text-2xl font-bold text-white">${totalEstimatedCostUsd.toLocaleString()}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Cooling</div>
              <div className="mt-2 text-2xl font-bold text-[var(--green-400)]">
                -{totalProjectedTempReductionC.toFixed(1)}°C
              </div>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Lives Protected</div>
              <div className="mt-2 text-2xl font-bold text-white">{totalProjectedLivesSaved}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
              <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">CO2 Reduced</div>
              <div className="mt-2 text-2xl font-bold text-white">{projectedCo2ReductionTons}t</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
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
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] px-4 py-3 text-sm font-bold text-[var(--bg-base)] disabled:opacity-50 "
          >
            {submitting ? 'Creating Scenario...' : 'Create Scenario'}
          </button>
        </section>
      </div>
    </div>
  );
}