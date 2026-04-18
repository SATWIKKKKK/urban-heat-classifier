import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getScenarios } from '@/lib/actions';

function getScenarioBadgeClasses(status: string) {
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
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-3">
            <span className="material-symbols-outlined text-[#699cff] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#699cff]">Scenarios</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-[family-name:var(--font-headline)]">Scenarios</h1>
          <p className="mt-1 text-sm text-[#6d758c]">
            Review mitigation plans, simulation impact, and approval status for your city.
          </p>
        </div>
        {session.user.role !== 'CITY_COUNCIL' && (
          <Link
            href="/dashboard/scenarios/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#69f6b8] to-[#06b77f] px-5 py-3 text-sm font-bold text-[#002919] shadow-lg shadow-[#69f6b8]/20 btn-shine"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            New Scenario
          </Link>
        )}
      </div>

      {visibleScenarios.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-[#6d758c]/30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>compare_arrows</span>
          <h3 className="text-xl font-bold text-white mb-2">No scenarios yet</h3>
          <p className="text-[#6d758c]">Create your first scenario to start planning.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleScenarios.map((scenario) => {
            const latestResult = scenario.simulationResults[0];
            const interventionsCount = scenario.scenarioInterventions.length;

            return (
              <Link
                key={scenario.id}
                href={`/dashboard/scenarios/${scenario.id}`}
                className="glass-card rounded-2xl p-6 transition hover:border-white/10 hover:scale-[1.01] group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">{scenario.name}</h2>
                    <p className="mt-1 text-sm text-[#a3aac4]">{scenario.description || 'No description provided.'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${getScenarioBadgeClasses(scenario.status)}`}>
                    {scenario.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[#060e20]/60 border border-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#6d758c]">Interventions</div>
                    <div className="mt-2 text-2xl font-bold text-white">{interventionsCount}</div>
                  </div>
                  <div className="rounded-xl bg-[#060e20]/60 border border-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#6d758c]">Lives Saved</div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {scenario.totalProjectedLivesSaved ?? '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#060e20]/60 border border-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#6d758c]">Cooling</div>
                    <div className="mt-2 text-2xl font-bold text-[#69f6b8]">
                      {scenario.totalProjectedTempReductionC != null
                        ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C`
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#060e20]/60 border border-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-widest text-[#6d758c]">Simulation</div>
                    <div className="mt-2 text-sm font-semibold text-white">
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