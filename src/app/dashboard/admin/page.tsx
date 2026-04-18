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
        <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-3">
          <span className="material-symbols-outlined text-[#ff716c] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff716c]">Super Admin</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white font-[family-name:var(--font-headline)]">System Admin</h1>
        <p className="mt-1 text-sm text-[#6d758c]">Monitor city adoption, data health, and heat-risk issues across the platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: 'Cities', value: citySummaries.length, color: '#69f6b8' },
          { label: 'Users', value: users.length, color: '#699cff' },
          { label: 'Neighborhoods', value: totalNeighborhoods, color: '#ff8439' },
          { label: 'Interventions', value: totalInterventions, color: '#dee5ff' },
          { label: 'Critical', value: totalCritical, color: '#ff716c' },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5 hover:scale-[1.02] transition-transform">
            <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">{s.label}</span>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">City Health</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-3">City</th>
                  <th className="px-6 py-3">Neighborhoods</th>
                  <th className="px-6 py-3">Users</th>
                  <th className="px-6 py-3">Data Health</th>
                  <th className="px-6 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {citySummaries.map((city) => (
                  <tr key={city.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 font-semibold text-white">{city.name}</td>
                    <td className="px-6 py-3 text-[#a3aac4]">{city.neighborhoodCount}</td>
                    <td className="px-6 py-3 text-[#a3aac4]">{city.userCount}</td>
                    <td className="px-6 py-3">
                      <div className="font-semibold text-white">{city.dataCoverage}%</div>
                      <div className="text-xs text-[#6d758c]">{city.dataHealthLabel}</div>
                    </td>
                    <td className="px-6 py-3 text-[#a3aac4]">{city.issues[0] || 'No active issues'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Recent Alerts</h3>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <p className="text-sm text-[#6d758c]">No issues need attention right now.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, index) => (
                  <div key={`${alert.city}-${alert.issue}-${index}`} className="glass-card rounded-xl px-4 py-4">
                    <div className="text-sm font-semibold text-white">{alert.city}</div>
                    <div className="mt-1 text-sm text-[#a3aac4]">{alert.issue}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white font-[family-name:var(--font-headline)]">Recent Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.slice(0, 12).map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-semibold text-white">{u.name ?? '—'}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{u.email}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{u.role}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{u.city?.name ?? '—'}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
