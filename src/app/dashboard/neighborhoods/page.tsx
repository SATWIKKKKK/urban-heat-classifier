import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNeighborhoods } from '@/lib/actions';
import Link from 'next/link';
import { computeVulnerabilityScore, getVulnerabilityBgColor } from '@/lib/compute/vulnerability';
import AddNeighborhoodForm from './AddNeighborhoodForm';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-3">
            <span className="material-symbols-outlined text-[#69f6b8] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#69f6b8]">Neighborhoods</span>
          </div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            Neighborhoods
          </h1>
          <p className="text-[#6d758c] mt-1">Manage neighborhoods, heat data, and vulnerability scores</p>
        </div>
      </div>

      <AddNeighborhoodForm cityId={session.user.cityId} />

      {neighborhoods.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl text-center">
          <span className="material-symbols-outlined text-6xl text-[#a3aac4]/30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          <h3 className="text-xl font-bold text-white mb-2">No neighborhoods yet</h3>
          <p className="text-[#a3aac4]">Add your first neighborhood above to get started.</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Population</th>
                  <th className="px-6 py-4">Area (km²)</th>
                  <th className="px-6 py-4">Latest Temp</th>
                  <th className="px-6 py-4">Vulnerability</th>
                  <th className="px-6 py-4">Interventions</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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

                  return (
                    <tr key={n.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#dee5ff]">{n.name}</td>
                      <td className="px-6 py-4 text-[#a3aac4]">{n.population?.toLocaleString() ?? '—'}</td>
                      <td className="px-6 py-4 text-[#a3aac4]">{n.areaSqkm?.toFixed(1) ?? '—'}</td>
                      <td className="px-6 py-4 font-bold text-[#ff8439]">{latest ? `${latest.avgTempCelsius.toFixed(1)}°C` : '—'}</td>

                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${getVulnerabilityBgColor(vuln.level)}`}>
                          {vuln.score}/100 {vuln.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#a3aac4]">{n.interventions.length}</td>
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/neighborhoods/${n.id}`} className="text-[#69f6b8] text-xs font-bold hover:underline">
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
    </div>
  );
}
