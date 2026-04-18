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
      return 'bg-[#69f6b8]/10 text-[#69f6b8] border border-[#69f6b8]/20';
    case 'SUBMITTED':
      return 'bg-[#ff8439]/10 text-[#ff8439] border border-[#ff8439]/20';
    case 'NEEDS_REVISION':
      return 'bg-[#ff716c]/10 text-[#ff716c] border border-[#ff716c]/20';
    default:
      return 'bg-white/5 text-[#a3aac4] border border-white/10';
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
          <Link href="/dashboard/scenarios" className="text-sm font-semibold text-[#69f6b8]">
            Back to scenarios
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white">{scenario.name}</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#a3aac4]">{scenario.description || 'No description provided.'}</p>
        </div>
        <span className={`inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${statusClasses(scenario.status)}`}>
          {scenario.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Budget</div>
          <div className="mt-2 text-3xl font-bold text-white">
            {scenario.totalEstimatedCostUsd != null
              ? `$${Math.round(scenario.totalEstimatedCostUsd).toLocaleString()}`
              : '—'}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Lives Protected</div>
          <div className="mt-2 text-3xl font-bold text-white">{scenario.totalProjectedLivesSaved ?? '—'}</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Cooling</div>
          <div className="mt-2 text-3xl font-bold text-[#69f6b8]">
            {scenario.totalProjectedTempReductionC != null
              ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C`
              : '—'}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-[11px] uppercase tracking-wider text-[#6d758c]">Payback / Efficiency</div>
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
          <div className="mt-4 grid gap-3 text-sm text-[#a3aac4]">
            <div>City: <span className="font-semibold text-white">{scenario.city.name}</span></div>
            <div>Created by: <span className="font-semibold text-white">{scenario.createdBy?.name || 'Unknown'}</span></div>
            <div>Priority: <span className="font-semibold text-white">{scenario.priority || 'Not set'}</span></div>
            <div>CO2 reduction: <span className="font-semibold text-white">{scenario.projectedCo2ReductionTons ?? summary?.projectedCo2ReductionTons ?? '—'} tons / year</span></div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold text-white">Included Interventions</h3>
            <div className="mt-4 space-y-3">
              {scenario.scenarioInterventions.map(({ id: linkId, intervention }) => (
                <div key={linkId} className="rounded-xl bg-white/5 border border-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
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
          <p className="mt-2 text-sm text-[#a3aac4]">
            {summary
              ? `Projected to protect ${summary.livesProtectedPerSummer || scenario.totalProjectedLivesSaved || 0} residents each summer.`
              : 'No simulation summary is attached to this scenario yet.'}
          </p>

          {neighborhoodResults.length > 0 && (
            <div className="mt-5 overflow-hidden rounded-xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                  <tr>
                    <th className="px-4 py-3">Neighborhood</th>
                    <th className="px-4 py-3">Cooling</th>
                    <th className="px-4 py-3">Lives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {neighborhoodResults.map((result) => (
                    <tr key={result.neighborhood}>
                      <td className="px-4 py-3 text-white">{result.neighborhood}</td>
                      <td className="px-4 py-3 text-[#69f6b8]">-{result.reductionCelsius.toFixed(1)}°C</td>
                      <td className="px-4 py-3 text-[#a3aac4]">{result.livesSaved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {session.user.role !== 'CITY_COUNCIL' && scenario.status === 'DRAFT' && (
              <form action={submitAction}>
                <button className="w-full rounded-xl bg-gradient-to-r from-[#ff8439] to-[#e06520] px-4 py-3 text-sm font-bold text-white btn-shine">
                  Submit for Approval
                </button>
              </form>
            )}
            {session.user.role === 'CITY_ADMIN' && scenario.status === 'SUBMITTED' && (
              <form action={approveAction}>
                <button className="w-full rounded-xl bg-gradient-to-r from-[#69f6b8] to-[#06b77f] px-4 py-3 text-sm font-bold text-[#002919] btn-shine">
                  Approve Scenario
                </button>
              </form>
            )}
            {scenario.status === 'APPROVED' && (
              <a
                href={`/api/scenarios/${scenario.id}/council-brief`}
                className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all"
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