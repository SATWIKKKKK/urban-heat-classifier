import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { getPlaceById, getPlaces } from '@/lib/actions';
import { computeVulnerabilityScore, getVulnerabilityBgColor } from '@/lib/compute/vulnerability';
import Link from 'next/link';
import AddHeatMeasurementForm from './AddHeatMeasurementForm';

export default async function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.cityId) redirect('/login');

  const { id } = await params;
  const place = await getPlaceById(id);
  if (!place) notFound();

  const allPlaces = await getPlaces(session.user.cityId);
  const cityAvgTemp =
    allPlaces.length > 0
      ? allPlaces.reduce((sum, n) => {
          const latest = n.heatMeasurements[0];
          return sum + (latest?.avgTempCelsius ?? 0);
        }, 0) / allPlaces.length
      : 30;

  const latest = place.heatMeasurements[0];
  const vuln = computeVulnerabilityScore(
    {
      id: place.id,
      name: place.name,
      population: place.population,
      areaSqkm: place.areaSqkm,
      medianIncome: place.medianIncome,
      pctElderly: place.pctElderly,
      pctChildren: place.pctChildren,
      avgTempCelsius: latest?.avgTempCelsius,

    },
    cityAvgTemp
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Link href="/dashboard/places" className="hover:text-[var(--green-400)]">Places</Link>
        <span>/</span>
        <span className="text-white font-semibold">{place.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            {place.name}
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
          { label: 'Population', value: place.population?.toLocaleString() ?? '—', icon: 'groups', color: 'var(--green-400)' },
          { label: 'Area', value: place.areaSqkm ? `${place.areaSqkm} km²` : '—', icon: 'square_foot', color: 'var(--info)' },
          { label: 'Median Income', value: place.medianIncome ? `$${(place.medianIncome / 1000).toFixed(0)}k` : '—', icon: 'payments', color: 'var(--high)' },
          { label: 'Latest Temp', value: latest ? `${latest.avgTempCelsius.toFixed(1)}°C` : '—', icon: 'thermostat', color: 'var(--critical)' },

          { label: '% Elderly', value: place.pctElderly != null ? `${place.pctElderly}%` : '—', icon: 'elderly', color: 'var(--high)' },
          { label: '% Children', value: place.pctChildren != null ? `${place.pctChildren}%` : '—', icon: 'child_care', color: 'var(--text-primary)' },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: item.color }}>{item.icon}</span>
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">{item.label}</span>
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
            <div key={f.name} className="bg-[var(--bg-elevated)] p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{f.name}</span>
                <span className="text-sm font-bold text-white">{f.points}/{f.maxPoints}</span>
              </div>
              <div className="h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(f.points / f.maxPoints) * 100}%`,
                    backgroundColor: f.points / f.maxPoints > 0.7 ? 'var(--critical)' : f.points / f.maxPoints > 0.4 ? 'var(--high)' : 'var(--green-400)',
                  }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 block">{f.value}</span>
            </div>
          ))}
        </div>
        {vuln.improvementSuggestions.length > 0 && (
          <div className="mt-4 p-4 bg-[var(--green-400)]/5 border border-[var(--green-400)]/20 rounded-lg">
            <h4 className="text-sm font-bold text-[var(--green-400)] mb-2">Improvement Suggestions</h4>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1">
              {vuln.improvementSuggestions.map((s, i) => (
                <li key={i}>• {s}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Heat Data Entry */}
      <AddHeatMeasurementForm placeId={place.id} />

      {/* Temperature History */}
      {place.heatMeasurements.length > 0 && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-6 border-b border-[var(--border)]">
            <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white">Temperature History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--bg-elevated)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Avg Temp</th>
                  <th className="px-6 py-3">Max Temp</th>
                  <th className="px-6 py-3">Min Temp</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {place.heatMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-elevated)]">
                    <td className="px-6 py-3 text-[var(--text-primary)]">{new Date(m.measurementDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3 font-bold text-[var(--high)]">{m.avgTempCelsius.toFixed(1)}°C</td>
                    <td className="px-6 py-3 text-[var(--critical)]">{m.maxTempCelsius?.toFixed(1) ?? '—'}°C</td>
                    <td className="px-6 py-3 text-[var(--info)]">{m.minTempCelsius?.toFixed(1) ?? '—'}°C</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{m.dataSource ?? 'Manual'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Interventions */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-[family-name:var(--font-headline)] font-bold text-lg text-white">Active Interventions</h3>
          <span className="text-xs text-[var(--text-secondary)]">{place.interventions.length} total</span>
        </div>
        {place.interventions.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)] text-sm">No interventions in this place yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[var(--bg-elevated)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Est. Reduction</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {place.interventions.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--bg-elevated)]">
                    <td className="px-6 py-3 font-semibold text-[var(--text-primary)]">{i.name}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)] capitalize">{i.type.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="px-6 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        i.status === 'COMPLETED' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                        i.status === 'IN_PROGRESS' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
                        'bg-[var(--high)]/10 text-[var(--high)]'
                      }`}>{i.status}</span>
                    </td>
                    <td className="px-6 py-3 text-[var(--green-400)]">{i.estimatedTempReductionC ? `${i.estimatedTempReductionC.toFixed(1)}°C` : '—'}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{i.estimatedCostUsd ? `$${(i.estimatedCostUsd / 1000).toFixed(0)}k` : '—'}</td>
                    <td className="px-6 py-3 text-[var(--text-secondary)]">{i.proposedBy?.name ?? '—'}</td>
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
