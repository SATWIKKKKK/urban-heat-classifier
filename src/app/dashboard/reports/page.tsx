import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Download } from 'lucide-react';
import DownloadLinkClient from '@/components/ui/DownloadLinkClient';

export default async function DashboardReportsPage() {
  const session = await auth();

  if (!session?.user?.cityId || !session.user.id) {
    redirect('/login');
  }

  const reports = await prisma.report.findMany({
    where: { cityId: session.user.cityId },
    include: {
      scenario: {
        include: {
          scenarioInterventions: {
            include: {
              intervention: {
                include: { place: { select: { id: true, name: true } } },
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>summarize</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Reports</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Reports</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Download generated impact reports and review planning output.
          </p>
        </div>
      </div>

      <section className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Generated Reports</h2>
        {reports.length === 0 ? (
          <div className="mt-4 border border-dashed border-[var(--border-strong)] rounded-md px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
            No reports generated yet. Run a scenario to generate your first report.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {reports.map((report) => {
              const place = report.scenario?.scenarioInterventions?.[0]?.intervention?.place;
              return (
                <div
                  key={report.id}
                  className="relative flex items-center justify-between gap-4 p-4 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl hover:border-[var(--border-strong)] transition-all group"
                >
                  {/* Row click → report detail */}
                  <Link href={`/dashboard/reports/${report.id}`} className="absolute inset-0 z-0 rounded-xl" aria-label={report.title} />
                  <div className="flex flex-col gap-1 min-w-0 relative z-10 pointer-events-none">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{report.title}</span>
                    <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                      {place && (
                        <>
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                          <span className="truncate">{place.name}</span>
                          <span className="text-[var(--text-tertiary)]">·</span>
                        </>
                      )}
                      <span>{new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                  {/* Download button — always visible, always green */}
                  <DownloadLinkClient
                    href={`/api/reports/${report.id}/pdf`}
                    className="relative z-10 flex items-center justify-center transition-all"
                    style={{
                      background: 'rgba(34,197,94,0.10)',
                      border: '1px solid rgba(34,197,94,0.25)',
                      borderRadius: '8px',
                      padding: '8px',
                      color: '#22c55e',
                      flexShrink: 0,
                    }}
                    aria-label="Download PDF"
                  >
                    <Download size={20} />
                  </DownloadLinkClient>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
