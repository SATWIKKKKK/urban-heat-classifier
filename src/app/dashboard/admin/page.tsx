import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { computeVulnerabilityScore } from '@/lib/compute/vulnerability';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  const [cities, users] = await Promise.all([
    prisma.city.findMany({
      include: {
        onboardingState: true,
        users: { select: { id: true, role: true } },
        interventions: { select: { id: true, status: true } },
        neighborhoods: {
          include: {
            heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        city: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const citySummaries = cities.map((city) => {
    const neighborhoodsWithMeasurements = city.neighborhoods.filter(
      (neighborhood) => neighborhood.heatMeasurements[0]?.avgTempCelsius != null
    );
    const cityAvgTemp = neighborhoodsWithMeasurements.length
      ? neighborhoodsWithMeasurements.reduce(
          (sum, neighborhood) => sum + (neighborhood.heatMeasurements[0]?.avgTempCelsius ?? 0),
          0
        ) / neighborhoodsWithMeasurements.length
      : 30;

    const criticalCount = city.neighborhoods.filter((neighborhood) => {
      const latest = neighborhood.heatMeasurements[0];
      const vulnerability = computeVulnerabilityScore(
        {
          id: neighborhood.id,
          name: neighborhood.name,
          population: neighborhood.population,
          areaSqkm: neighborhood.areaSqkm,
          medianIncome: neighborhood.medianIncome,
          pctElderly: neighborhood.pctElderly,
          pctChildren: neighborhood.pctChildren,
          avgTempCelsius: latest?.avgTempCelsius,
          treeCanopyPct: latest?.treeCanopyPct ?? undefined,
          imperviousSurfacePct: latest?.imperviousSurfacePct ?? undefined,
        },
        cityAvgTemp
      );

      return vulnerability.level === 'CRITICAL';
    }).length;

    const dataCoverage = city.neighborhoods.length
      ? Math.round((neighborhoodsWithMeasurements.length / city.neighborhoods.length) * 100)
      : 0;

    const issues: string[] = [];
    if (!city.onboardingState?.isComplete) {
      issues.push('Onboarding incomplete');
    }
    if (dataCoverage < 70) {
      issues.push('Low heat-data coverage');
    }
    if (criticalCount > 0) {
      issues.push(`${criticalCount} critical neighborhoods`);
    }
    if (city.interventions.length === 0) {
      issues.push('No interventions planned');
    }

    return {
      id: city.id,
      name: city.name,
      slug: city.slug,
      userCount: city.users.length,
      neighborhoodCount: city.neighborhoods.length,
      interventionCount: city.interventions.length,
      criticalCount,
      dataCoverage,
      issues,
      dataHealthLabel: dataCoverage >= 85 ? 'Healthy' : dataCoverage >= 70 ? 'Monitor' : 'Needs attention',
    };
  });

  const totalNeighborhoods = citySummaries.reduce((sum, city) => sum + city.neighborhoodCount, 0);
  const totalInterventions = citySummaries.reduce((sum, city) => sum + city.interventionCount, 0);
  const totalCritical = citySummaries.reduce((sum, city) => sum + city.criticalCount, 0);
  const alerts = citySummaries.flatMap((city) => city.issues.map((issue) => ({ city: city.name, issue }))).slice(0, 8);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Super Admin</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">System Admin</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">Monitor city adoption, data health, and heat-risk issues across the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'Cities', value: citySummaries.length, color: 'var(--green-400)' },
          { label: 'Users', value: users.length, color: 'var(--info)' },
          { label: 'Neighborhoods', value: totalNeighborhoods, color: 'var(--high)' },
          { label: 'Interventions', value: totalInterventions, color: 'var(--text-primary)' },
          { label: 'Critical', value: totalCritical, color: 'var(--critical)' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-3">
            <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{s.label}</span>
            <div className="text-2xl font-bold tabular-nums mt-0.5" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">City Health</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em] font-medium">
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Neighborhoods</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Data Health</th>
                  <th className="px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {citySummaries.map((city) => (
                  <tr key={city.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{city.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{city.neighborhoodCount}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{city.userCount}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{city.dataCoverage}%</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{city.dataHealthLabel}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{city.issues[0] || 'No active issues'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Alerts</h3>
          </div>
          <div className="p-4">
            {alerts.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No issues need attention right now.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, index) => (
                  <div key={`${alert.city}-${alert.issue}-${index}`} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-3 py-2.5">
                    <div className="text-xs font-medium text-[var(--text-primary)]">{alert.city}</div>
                    <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{alert.issue}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em] font-medium">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.slice(0, 12).map((u) => (
                <tr key={u.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.role}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.city?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
