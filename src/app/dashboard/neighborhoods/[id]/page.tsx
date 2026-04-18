import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getNeighborhoodById, getNeighborhoods } from '@/lib/actions';
import { computeVulnerabilityScore, getVulnerabilityBgColor } from '@/lib/compute/vulnerability';
import Link from 'next/link';
import AddHeatMeasurementForm from './AddHeatMeasurementForm';

export default async function NeighborhoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.cityId) redirect('/login');

  const { id } = await params;
  const neighborhood = await getNeighborhoodById(id);
  if (!neighborhood) notFound();

  const allNeighborhoods = await getNeighborhoods(session.user.cityId);
  const cityAvgTemp =
    allNeighborhoods.length > 0
      ? allNeighborhoods.reduce((sum, n) => {
          const latest = n.heatMeasurements[0];
          return sum + (latest?.avgTempCelsius ?? 0);
        }, 0) / allNeighborhoods.length
      : 30;

  const latest = neighborhood.heatMeasurements[0];
  const vuln = computeVulnerabilityScore(
    {
      id: neighborhood.id,
      name: neighborhood.name,
      population: neighborhood.population,
      areaSqkm: neighborhood.areaSqkm,
      medianIncome: neighborhood.medianIncome,
      pctElderly: neighborhood.pctElderly,
      pctChildren: neighborhood.pctChildren,
      avgTempCelsius: latest?.avgTempCelsius,

    },
    cityAvgTemp
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#a3aac4]">
        <Link href="/dashboard/neighborhoods" className="hover:text-[#69f6b8]">Neighborhoods</Link>
        <span>/</span>
        <span className="text-white font-semibold">{neighborhood.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            {neighborhood.name}
          </h1>
          <div className="flex gap-4 mt-2 flex-wrap">
            <span className={`text-xs font-bold px-3 py-1 rounded border ${getVulnerabilityBgColor(vuln.level)}`}>
              Vulnerability: {vuln.score}/100 ({vuln.level})
            </span>
          </div>
        </div>
      </div>

      {/* Profile Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Population', value: neighborhood.population?.toLocaleString() ?? '—', icon: 'groups', color: '#69f6b8' },
          { label: 'Area', value: neighborhood.areaSqkm ? `${neighborhood.areaSqkm} km²` : '—', icon: 'square_foot', color: '#699cff' },
          { label: 'Median Income', value: neighborhood.medianIncome ? `$${(neighborhood.medianIncome / 1000).toFixed(0)}k` : '—', icon: 'payments', color: '#ff8439' },
          { label: 'Latest Temp', value: latest ? `${latest.avgTempCelsius.toFixed(1)}°C` : '—', icon: 'thermostat', color: '#ff716c' },

          { label: '% Elderly', value: neighborhood.pctElderly != null ? `${neighborhood.pctElderly}%` : '—', icon: 'elderly', color: '#ff8439' },
          { label: '% Children', value: neighborhood.pctChildren != null ? `${neighborhood.pctChildren}%` : '—', icon: 'child_care', color: '#dee5ff' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>{item.icon}</span>
              <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">{item.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Vulnerability Breakdown */}
      <div className="glass-card p-6 rounded-xl">
        <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white mb-4">Vulnerability Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vuln.factors.map((f) => (
            <div key={f.name} className="bg-white/5 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[#dee5ff]">{f.name}</span>
                <span className="text-sm font-bold text-white">{f.points}/{f.maxPoints}</span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(f.points / f.maxPoints) * 100}%`,
                    backgroundColor: f.points / f.maxPoints > 0.7 ? '#ff716c' : f.points / f.maxPoints > 0.4 ? '#ff8439' : '#69f6b8',
                  }}
                />
              </div>
              <span className="text-[10px] text-[#a3aac4] mt-1 block">{f.value}</span>
            </div>
          ))}
        </div>
        {vuln.improvementSuggestions.length > 0 && (
          <div className="mt-4 p-4 bg-[#69f6b8]/5 border border-[#69f6b8]/20 rounded-lg">
            <h4 className="text-sm font-bold text-[#69f6b8] mb-2">Improvement Suggestions</h4>
            <ul className="text-xs text-[#a3aac4] space-y-1">
              {vuln.improvementSuggestions.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Heat Data Entry */}
      <AddHeatMeasurementForm neighborhoodId={neighborhood.id} />

      {/* Temperature History */}
      {neighborhood.heatMeasurements.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/5">
            <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white">Temperature History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Avg Temp</th>
                  <th className="px-6 py-3">Max Temp</th>
                  <th className="px-6 py-3">Min Temp</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {neighborhood.heatMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-[#dee5ff]">{new Date(m.measurementDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 font-bold text-[#ff8439]">{m.avgTempCelsius.toFixed(1)}°C</td>
                    <td className="px-6 py-3 text-[#ff716c]">{m.maxTempCelsius?.toFixed(1) ?? '—'}°C</td>
                    <td className="px-6 py-3 text-[#699cff]">{m.minTempCelsius?.toFixed(1) ?? '—'}°C</td>
                    <td className="px-6 py-3 text-[#a3aac4]">{m.dataSource ?? 'Manual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Interventions */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white">Active Interventions</h3>
          <span className="text-xs text-[#a3aac4]">{neighborhood.interventions.length} total</span>
        </div>
        {neighborhood.interventions.length === 0 ? (
          <div className="p-8 text-center text-[#a3aac4] text-sm">No interventions in this neighborhood yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Est. Reduction</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {neighborhood.interventions.map((i) => (
                  <tr key={i.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 font-semibold text-[#dee5ff]">{i.name}</td>
                    <td className="px-6 py-3 text-[#a3aac4] capitalize">{i.type.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        i.status === 'COMPLETED' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' :
                        i.status === 'IN_PROGRESS' ? 'bg-[#699cff]/10 text-[#699cff]' :
                        'bg-[#ff8439]/10 text-[#ff8439]'
                      }`}>{i.status}</span>
                    </td>
                    <td className="px-6 py-3 text-[#69f6b8]">{i.estimatedTempReductionC ? `${i.estimatedTempReductionC.toFixed(1)}°C` : '—'}</td>
                    <td className="px-6 py-3 text-[#a3aac4]">{i.estimatedCostUsd ? `$${(i.estimatedCostUsd / 1000).toFixed(0)}k` : '—'}</td>
                    <td className="px-6 py-3 text-[#a3aac4]">{i.proposedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
