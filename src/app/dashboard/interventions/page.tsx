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
          <h1 className="font-[var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            Interventions
          </h1>
          <p className="text-[#a3aac4] mt-1">Manage heat mitigation interventions across your city</p>
        </div>
      </div>

      <AddInterventionForm cityId={session.user.cityId} userId={session.user.id!} />

      {interventions.length === 0 ? (
        <div className="glass-card p-12 rounded-xl text-center">
          <span className="material-symbols-outlined text-6xl text-[#a3aac4]/30 mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
          <h3 className="text-xl font-bold text-white mb-2">No interventions yet</h3>
          <p className="text-[#a3aac4]">Create your first intervention above to get started.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-white/5 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Neighborhood</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Est. Reduction</th>
                  <th className="px-6 py-4">Cost</th>
                  <th className="px-6 py-4">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {interventions.map((i) => (
                  <tr key={i.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#dee5ff]">{i.name}</td>
                    <td className="px-6 py-4 text-[#a3aac4] capitalize">{i.type.replace(/_/g, ' ').toLowerCase()}</td>
                    <td className="px-6 py-4 text-[#a3aac4]">{i.neighborhood?.name ?? 'City-wide'}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                        i.status === 'COMPLETED' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' :
                        i.status === 'IN_PROGRESS' ? 'bg-[#699cff]/10 text-[#699cff]' :
                        i.status === 'APPROVED' ? 'bg-[#dee5ff]/10 text-[#dee5ff]' :
                        'bg-[#ff8439]/10 text-[#ff8439]'
                      }`}>{i.status}</span>
                    </td>
                    <td className="px-6 py-4 text-[#69f6b8]">{i.estimatedTempReductionC ? `${i.estimatedTempReductionC.toFixed(1)}°C` : '—'}</td>
                    <td className="px-6 py-4 text-[#a3aac4]">{i.estimatedCostUsd ? `$${(i.estimatedCostUsd / 1000).toFixed(0)}k` : '—'}</td>
                    <td className="px-6 py-4 text-[#a3aac4]">{i.proposedBy?.name ?? '—'}</td>
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
