import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const VULN_COLORS: Record<string, { bg: string; text: string }> = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
  MODERATE: { bg: 'rgba(234,179,8,0.12)',  text: '#eab308' },
  LOW:      { bg: 'rgba(34,197,94,0.12)',  text: '#22c55e' },
};

export default async function DashboardReportsPage() {
  const session = await auth();

  if (!session?.user?.id) redirect('/login');
  if (session.user.role !== 'CITY_ADMIN') redirect('/dashboard/map');
  if (!session.user.cityId) redirect('/dashboard/mydata');

  const reports = await prisma.report.findMany({
    where: { cityId: session.user.cityId },
    include: {
      scenario: {
        include: {
          scenarioInterventions: {
            include: {
              intervention: {
                include: {
                  place: {
                    select: { id: true, name: true, vulnerabilityLevel: true, vulnerabilityScore: true },
                  },
                },
              },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { generatedAt: 'desc' },
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Reports</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports</h1>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Generated heat mitigation reports for your city.
            </p>
          </div>
          <span className="w-fit shrink-0 text-xs text-[var(--text-tertiary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {reports.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-5 py-12 sm:py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-2xl">description</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">No reports yet</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-xs">
              Generate a scenario to create your first heat mitigation report.
            </p>
          </div>
          <Link
            href="/dashboard/scenarios"
            className="px-5 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:border-[rgba(34,197,94,0.40)] hover:text-[#22c55e] transition-colors"
          >
            Go to Scenarios
          </Link>
        </div>
      ) : (
        /* Report list */
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const place = report.scenario?.scenarioInterventions?.[0]?.intervention?.place;
            const vulnLevel = place?.vulnerabilityLevel ?? null;
            const vulnStyle = VULN_COLORS[vulnLevel ?? ''] ?? null;
            const dateStr = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(report.generatedAt));

            return (
              <div
                key={report.id}
                className="group relative flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl hover:border-[rgba(34,197,94,0.35)] transition-all"
              >
                {/* Left: icon */}
                <div className="shrink-0 w-10 h-10 rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.20)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#22c55e] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                </div>

                {/* Center: info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{report.title}</span>
                    <span
                      className="shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={report.status === 'PUBLISHED'
                        ? { background: 'rgba(34,197,94,0.12)', color: '#22c55e' }
                        : { background: 'rgba(100,116,139,0.12)', color: '#64748b' }
                      }
                    >
                      {report.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                    {place && (
                      <>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                          {place.name}
                        </span>
                        {vulnLevel && vulnStyle && (
                          <span
                            className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                            style={{ background: vulnStyle.bg, color: vulnStyle.text }}
                          >
                            {vulnLevel}
                          </span>
                        )}
                        <span className="text-[var(--text-tertiary)]">·</span>
                      </>
                    )}
                    <span>{dateStr}</span>
                  </div>
                </div>

                {/* Right: action */}
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  className="w-full sm:w-auto justify-center shrink-0 flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-[#22c55e] border border-[rgba(34,197,94,0.30)] rounded-lg hover:bg-[rgba(34,197,94,0.08)] transition-colors whitespace-nowrap"
                >
                  View Report
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

