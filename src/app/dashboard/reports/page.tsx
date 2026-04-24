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
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Reports</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Generate impact reports, manage council briefs, and review published planning output.
          </p>
        </div>
        {session.user.role !== 'CITY_COUNCIL' && (
          <Link href="/dashboard/reports/generate" className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--green-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--green-400)] transition-colors">
            <span className="material-symbols-outlined text-base">add</span>
            Generate Report
          </Link>
        )}
      </div>

      {approvedScenarios.length > 0 && (
        <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Council Briefs</h2>
          <div className="mt-3 flex flex-col gap-2">
            {approvedScenarios.map((scenario) => (
              <div key={scenario.id} className="flex flex-col gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{scenario.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {scenario.totalProjectedLivesSaved ?? 'Pending'} lives protected · {scenario.totalProjectedTempReductionC != null ? `-${scenario.totalProjectedTempReductionC.toFixed(1)}°C` : 'Cooling pending'}
                  </div>
                </div>
                <a href={`/api/scenarios/${scenario.id}/council-brief`} className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors">
                  <span className="material-symbols-outlined text-sm">download</span>
                  Council Brief PDF
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generated Reports</h2>
        {reports.length === 0 ? (
          <div className="mt-4 border border-dashed border-[var(--border-strong)] rounded-md px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
            No reports generated yet.
          </div>
        ) : (
          <div className="mt-3 overflow-hidden border border-[var(--border)] rounded-md">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--text-tertiary)] text-[11px] uppercase tracking-[0.06em] font-medium">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{report.title}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{report.type}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{report.status}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{new Date(report.generatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {report.status === 'COMPLETED' ? (
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/reports/${report.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
                          >
                            View Report
                          </Link>
                          <Link
                            href={`/dashboard/reports/${report.id}?download=true`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[var(--green-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--green-400)] transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Download PDF
                          </Link>
                        </div>
                      ) : (
                        <span className="text-[var(--text-tertiary)] text-xs">—</span>
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
