import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getScenarios } from '@/lib/actions';

function getScenarioBadgeStyle(status: string) {
  switch (status) {
    case 'APPROVED': return { color: 'var(--low)', borderColor: '#22c55e4d', backgroundColor: '#22c55e1a' };
    case 'SUBMITTED': return { color: 'var(--high)', borderColor: '#f973164d', backgroundColor: '#f973161a' };
    case 'NEEDS_REVISION': return { color: 'var(--critical)', borderColor: '#ef44444d', backgroundColor: '#ef44441a' };
    default: return { color: 'var(--text-tertiary)', borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-elevated)' };
  }
}

export default async function DashboardScenariosPage() {
  const session = await auth();

  if (!session?.user?.cityId) {
    redirect('/login');
  }

  const scenarios = await getScenarios(session.user.cityId);
  const visibleScenarios =
    session.user.role === 'CITY_COUNCIL'
      ? scenarios.filter((scenario) => scenario.status === 'APPROVED')
      : scenarios;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Scenarios</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Scenarios</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Review your heat mitigation plans, simulation results, and scenario reports.
          </p>
        </div>
        {session.user.role !== 'CITY_COUNCIL' && (
          <Link
            href="/dashboard/scenarios/new"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--green-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--green-400)] transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Scenario
          </Link>
        )}
      </div>

      {visibleScenarios.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--text-tertiary)] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No scenarios yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">Create your first scenario to start planning.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleScenarios.map((scenario) => {
            const latestResult = scenario.simulationResults[0];
            const interventionsCount = scenario.scenarioInterventions.length;

            return (
              <Link
                key={scenario.id}
                href={`/dashboard/scenarios/${scenario.id}/report`}
                className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5 hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">{scenario.name}</h2>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-2">{scenario.description || 'No description provided.'}</p>
                  </div>
                  <span
                    className="shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] border"
                    style={getScenarioBadgeStyle(scenario.status)}
                  >
                    {scenario.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Strategies</div>
                    <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">{interventionsCount}</div>
                  </div>
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Lives Saved</div>
                    <div className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                      {scenario.totalProjectedLivesSaved ?? '—'}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Cooling</div>
                    <div className="mt-1 text-xl font-bold text-[var(--green-400)]">
                      {scenario.totalProjectedTempReductionC != null
                        ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C`
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Simulation</div>
                    <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                      {latestResult ? 'Available' : 'Pending'}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
