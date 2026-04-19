import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNeighborhoods } from '@/lib/actions';
import Link from 'next/link';
import { computeVulnerabilityScore } from '@/lib/compute/vulnerability';
import AddNeighborhoodForm from './AddNeighborhoodForm';
import GSAPWrapper from '@/components/shared/GSAPWrapper';

export default async function NeighborhoodsPage() {
  const session = await auth();
  if (!session?.user?.cityId) redirect('/login');

  const neighborhoods = await getNeighborhoods(session.user.cityId);

  const cityAvgTemp =
    neighborhoods.length > 0
      ? neighborhoods.reduce((sum, n) => {
          const latest = n.heatMeasurements[0];
          return sum + (latest?.avgTempCelsius ?? 0);
        }, 0) / neighborhoods.length
      : 30;

  return (
    <div className="flex flex-col gap-8">
      <GSAPWrapper animation="slideUp" duration={0.4}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Neighborhoods</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Neighborhoods
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage neighborhoods, heat data, and vulnerability scores</p>
        </div>
      </div>
      </GSAPWrapper>

      <AddNeighborhoodForm cityId={session.user.cityId} />

      <GSAPWrapper animation="slideUp" delay={0.15} duration={0.5}>
      {neighborhoods.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--text-tertiary)] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No neighborhoods yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">Add your first neighborhood above to get started.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em] font-medium">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Population</th>
                  <th className="px-4 py-3">Area (km²)</th>
                  <th className="px-4 py-3">Latest Temp</th>
                  <th className="px-4 py-3">Vulnerability</th>
                  <th className="px-4 py-3">Interventions</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {neighborhoods.map((n) => {
                  const latest = n.heatMeasurements[0];
                  const vuln = computeVulnerabilityScore(
                    {
                      id: n.id,
                      name: n.name,
                      population: n.population,
                      areaSqkm: n.areaSqkm,
                      medianIncome: n.medianIncome,
                      pctElderly: n.pctElderly,
                      pctChildren: n.pctChildren,
                      avgTempCelsius: latest?.avgTempCelsius,

                    },
                    cityAvgTemp
                  );

                  const vulnColor = vuln.level === 'CRITICAL' ? 'var(--critical)' : vuln.level === 'HIGH' ? 'var(--high)' : vuln.level === 'MODERATE' ? 'var(--moderate)' : 'var(--low)';

                  return (
                    <tr key={n.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{n.name}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{n.population?.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{n.areaSqkm?.toFixed(1) ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--high)]">{latest ? `${latest.avgTempCelsius.toFixed(1)}°C` : '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.05em] rounded px-2 py-0.5 border"
                          style={{
                            color: vulnColor,
                            borderColor: `${vulnColor}4d`,
                            backgroundColor: `${vulnColor}1a`,
                          }}
                        >
                          {vuln.score}/100 · {vuln.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{n.interventions.length}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/neighborhoods/${n.id}`} className="text-xs font-medium text-[var(--green-400)] hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </GSAPWrapper>
    </div>
  );
}
