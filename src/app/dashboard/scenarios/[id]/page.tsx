import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { approveScenarioAction, submitScenarioAction } from '@/lib/actions';

function parseJsonValue<T>(value: string | null | undefined): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function statusClasses(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-[var(--green-400)]/10 text-[var(--green-400)] border border-[var(--green-400)]/20';
    case 'SUBMITTED':
      return 'bg-[var(--high)]/10 text-[var(--high)] border border-[var(--high)]/20';
    case 'NEEDS_REVISION':
      return 'bg-[var(--critical)]/10 text-[var(--critical)] border border-[var(--critical)]/20';
    default:
      return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]';
  }
}

export default async function ScenarioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user?.cityId || !session.user.id) {
    redirect('/login');
  }

  const { id } = await params;
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      scenarioInterventions: {
        include: {
          intervention: {
            include: {
              neighborhood: { select: { name: true } },
            },
          },
        },
      },
      simulationResults: {
        orderBy: { runAt: 'desc' },
        take: 1,
      },
      createdBy: { select: { name: true } },
      city: { select: { name: true } },
    },
  });

  if (!scenario || scenario.cityId !== session.user.cityId) {
    notFound();
  }

  if (session.user.role === 'CITY_COUNCIL' && scenario.status !== 'APPROVED') {
    redirect('/dashboard/scenarios');
  }

  const scenarioId = scenario.id;
  const sessionUserId = session.user.id;

  const latestResult = scenario.simulationResults[0];
  const summary = parseJsonValue<{
    averageTempReductionCelsius?: number;
    livesProtectedPerSummer?: number;
    projectedCo2ReductionTons?: number;
    costPerLifeProtected?: number | null;
  }>(latestResult?.outputSummary);
  const neighborhoodResults =
    parseJsonValue<Array<{ neighborhood: string; reductionCelsius: number; livesSaved: number }>>(
      latestResult?.neighborhoodResults
    ) || [];

  async function submitAction() {
    'use server';
    await submitScenarioAction(scenarioId, sessionUserId);
    redirect(`/dashboard/scenarios/${scenarioId}`);
  }

  async function approveAction() {
    'use server';
    await approveScenarioAction(scenarioId, sessionUserId);
    redirect(`/dashboard/scenarios/${scenarioId}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/dashboard/scenarios" className="text-sm font-semibold text-[var(--green-400)]">
            Back to scenarios
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">{scenario.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">{scenario.description || 'No description provided.'}</p>
        </div>
        <span className={`inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${statusClasses(scenario.status)}`}>
          {scenario.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Budget</div>
          <div className="mt-2 text-3xl font-bold text-white">
            {scenario.totalEstimatedCostUsd != null
              ? `$${Math.round(scenario.totalEstimatedCostUsd).toLocaleString()}`
              : '—'}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Lives Protected</div>
          <div className="mt-2 text-3xl font-bold text-white">{scenario.totalProjectedLivesSaved ?? '—'}</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Cooling</div>
          <div className="mt-2 text-3xl font-bold text-[var(--green-400)]">
            {scenario.totalProjectedTempReductionC != null
              ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C`
              : '—'}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">Payback / Efficiency</div>
          <div className="mt-2 text-3xl font-bold text-white">
            {summary?.costPerLifeProtected != null
              ? `$${summary.costPerLifeProtected.toLocaleString()}`
              : '—'}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white">Plan Summary</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)]">
            <div>City: <span className="font-semibold text-white">{scenario.city.name}</span></div>
            <div>Created by: <span className="font-semibold text-white">{scenario.createdBy?.name || 'Unknown'}</span></div>
            <div>Priority: <span className="font-semibold text-white">{scenario.priority || 'Not set'}</span></div>
            <div>CO2 reduction: <span className="font-semibold text-white">{scenario.projectedCo2ReductionTons ?? summary?.projectedCo2ReductionTons ?? '—'} tons / year</span></div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold text-white">Included Interventions</h3>
            <div className="mt-4 space-y-3">
              {scenario.scenarioInterventions.map(({ id: linkId, intervention }) => (
                <div key={linkId} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{intervention.name}</div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        {intervention.neighborhood?.name || 'City-wide'} · {intervention.type.replace(/_/g, ' ')}
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
                          ? `$${Math.round(intervention.estimatedCostUsd).toLocaleString()}`
                          : 'Cost pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white">Simulation Results</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {summary
              ? `Projected to protect ${summary.livesProtectedPerSummer || scenario.totalProjectedLivesSaved || 0} residents each summer.`
              : 'No simulation summary is attached to this scenario yet.'}
          </p>

          {neighborhoodResults.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                  <tr>
                    <th className="px-4 py-3">Neighborhood</th>
                    <th className="px-4 py-3">Cooling</th>
                    <th className="px-4 py-3">Lives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {neighborhoodResults.map((result) => (
                    <tr key={result.neighborhood}>
                      <td className="px-4 py-3 text-white">{result.neighborhood}</td>
                      <td className="px-4 py-3 text-[var(--green-400)]">-{result.reductionCelsius.toFixed(1)}°C</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{result.livesSaved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {session.user.role !== 'CITY_COUNCIL' && scenario.status === 'DRAFT' && (
              <form action={submitAction}>
                <button className="w-full rounded-xl bg-gradient-to-r from-[var(--high)] to-[#e06520] px-4 py-3 text-sm font-bold text-white ">
                  Submit for Approval
                </button>
              </form>
            )}
            {session.user.role === 'CITY_ADMIN' && scenario.status === 'SUBMITTED' && (
              <form action={approveAction}>
                <button className="w-full rounded-xl bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] px-4 py-3 text-sm font-bold text-[var(--bg-base)] ">
                  Approve Scenario
                </button>
              </form>
            )}
            {scenario.status === 'APPROVED' && (
              <a
                href={`/api/scenarios/${scenario.id}/council-brief`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--bg-elevated)] transition-all"
              >
                Download Council Brief PDF
              </a>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}