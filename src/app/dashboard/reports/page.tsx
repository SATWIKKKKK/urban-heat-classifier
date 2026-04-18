import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getReports, getScenarios } from '@/lib/actions';

export default async function DashboardReportsPage() {
  const session = await auth();

  if (!session?.user?.cityId || !session.user.id) {
    redirect('/login');
  }

  const [reports, scenarios] = await Promise.all([
    getReports(session.user.cityId),
    getScenarios(session.user.cityId),
  ]);

  const approvedScenarios = scenarios.filter((scenario) => scenario.status === 'APPROVED');

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-3">
            <span className="material-symbols-outlined text-[#ff8439] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff8439]">Reports</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-[family-name:var(--font-headline)]">Reports</h1>
          <p className="mt-1 text-sm text-[#6d758c]">
            Generate impact reports, manage council briefs, and review published planning output.
          </p>
        </div>
        {session.user.role !== 'CITY_COUNCIL' && (
          <Link href="/dashboard/reports/generate" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#69f6b8] to-[#06b77f] px-5 py-3 text-sm font-bold text-[#002919] shadow-lg shadow-[#69f6b8]/20 btn-shine">
            <span className="material-symbols-outlined text-lg">add</span>
            Generate Report
          </Link>
        )}
      </div>

      {approvedScenarios.length > 0 && (
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white">Council Briefs</h2>
          <div className="mt-4 grid gap-3">
            {approvedScenarios.map((scenario) => (
              <div key={scenario.id} className="flex flex-col gap-3 rounded-xl bg-white/5 border border-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-semibold text-white">{scenario.name}</div>
                  <div className="mt-1 text-sm text-[#a3aac4]">
                    {scenario.totalProjectedLivesSaved ?? 'Pending'} lives protected · {scenario.totalProjectedTempReductionC != null ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C` : 'Cooling pending'}
                  </div>
                </div>
                <a href={`/api/scenarios/${scenario.id}/council-brief`} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 transition-all">
                  Download Council Brief PDF
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white">Generated Reports</h2>
        {reports.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-[#6d758c]">
            No reports generated yet.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-[#6d758c] uppercase text-[10px] tracking-widest font-bold">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{report.title}</td>
                    <td className="px-4 py-3 text-[#a3aac4]">{report.type}</td>
                    <td className="px-4 py-3 text-[#a3aac4]">{report.status}</td>
                    <td className="px-4 py-3 text-[#a3aac4]">{new Date(report.generatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {report.status === 'COMPLETED' ? (
                        <a
                          href={`/api/reports/${report.id}/pdf`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          PDF
                        </a>
                      ) : (
                        <span className="text-[#6d758c] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
