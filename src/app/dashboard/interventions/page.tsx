import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getInterventions } from '@/lib/actions';
import AddInterventionForm from './AddInterventionForm';

export default async function InterventionsPage() {
  const session = await auth();
  if (!session?.user?.cityId) redirect('/login');

  const interventions = await getInterventions(session.user.cityId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Interventions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Interventions
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Manage heat mitigation interventions across your city</p>
        </div>
      </div>

      <AddInterventionForm cityId={session.user.cityId} />

      {interventions.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--text-tertiary)] mb-3" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No interventions yet</h3>
          <p className="text-sm text-[var(--text-secondary)]">Create your first intervention above to get started.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em] font-medium">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Neighborhood</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Est. Reduction</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {interventions.map((i) => (
                  <tr key={i.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{i.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">{i.type.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{i.neighborhood?.name ?? 'City-wide'}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-[0.04em]"
                        style={{
                          color: i.status === 'COMPLETED' ? 'var(--low)' : i.status === 'IN_PROGRESS' ? 'var(--info)' : i.status === 'APPROVED' ? 'var(--text-primary)' : 'var(--high)',
                          borderColor: i.status === 'COMPLETED' ? 'var(--low)' : i.status === 'IN_PROGRESS' ? 'var(--info)' : i.status === 'APPROVED' ? 'var(--border-strong)' : 'var(--high)',
                          backgroundColor: i.status === 'COMPLETED' ? '#22c55e1a' : i.status === 'IN_PROGRESS' ? '#3b82f61a' : i.status === 'APPROVED' ? 'var(--bg-elevated)' : '#f973161a',
                        }}
                      >{i.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--low)]">{i.estimatedTempReductionC ? `-${i.estimatedTempReductionC.toFixed(1)}°C` : '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{i.estimatedCostUsd ? `$${(i.estimatedCostUsd / 1000).toFixed(0)}k` : '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{i.proposedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
