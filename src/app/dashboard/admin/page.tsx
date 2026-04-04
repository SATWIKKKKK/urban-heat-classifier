import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') redirect('/dashboard');

  const [cities, users, totalNeighborhoods, totalInterventions] = await Promise.all([
    prisma.city.findMany({ include: { _count: { select: { users: true, neighborhoods: true } } } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, city: { select: { name: true } }, createdAt: true } }),
    prisma.neighborhood.count(),
    prisma.intervention.count(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-[var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
          Admin Panel
        </h1>
        <p className="text-[#a3aac4] mt-1">Super admin overview of all cities and users</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Cities', value: cities.length, color: '#69f6b8' },
          { label: 'Users', value: users.length, color: '#699cff' },
          { label: 'Neighborhoods', value: totalNeighborhoods, color: '#ff8439' },
          { label: 'Interventions', value: totalInterventions, color: '#dee5ff' },
        ].map((s) => (
          <div key={s.label} className="glass-card-hover p-5 rounded-xl">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">{s.label}</span>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Cities */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-[var(--font-headline)] font-bold text-lg text-white">Cities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Slug</th>
                <th className="px-6 py-3">Users</th>
                <th className="px-6 py-3">Neighborhoods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cities.map((c) => (
                <tr key={c.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-semibold text-white">{c.name}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{c.slug}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{c._count.users}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{c._count.neighborhoods}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-[var(--font-headline)] font-bold text-lg text-white">Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-500 uppercase text-[10px] tracking-widest font-bold">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">City</th>
                <th className="px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/5">
                  <td className="px-6 py-3 font-semibold text-white">{u.name ?? '—'}</td>
                  <td className="px-6 py-3 text-[#a3aac4]">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                      u.role === 'SUPER_ADMIN' ? 'bg-[#ff716c]/10 text-[#ff716c]' :
                      u.role === 'CITY_ADMIN' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' :
                      'bg-[#699cff]/10 text-[#699cff]'
                    }`}>{u.role}</span>
                  </td>
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
