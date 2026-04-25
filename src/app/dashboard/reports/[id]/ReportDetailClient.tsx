'use client';

import { useState } from 'react';
import Link from 'next/link';

/* ── Helpers ─────────────────────────────────────────────────────────────────── */

function safe(primary: unknown, ...fallbacks: unknown[]): string {
  for (const v of [primary, ...fallbacks]) {
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v);
  }
  return '';
}

function fmt(n: number | null | undefined, sym = ''): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `${sym}${(n / 10_000_000).toFixed(1)} Cr`;
  if (abs >= 100_000)    return `${sym}${(n / 100_000).toFixed(1)} L`;
  if (abs >= 1_000)      return `${sym}${(n / 1_000).toFixed(1)}K`;
  return `${sym}${n.toFixed(0)}`;
}

const VULN: Record<string, { color: string; bg: string; border: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)' },
  HIGH:     { color: '#f97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' },
  MODERATE: { color: '#eab308', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.25)' },
  LOW:      { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)' },
};
function vl(level: string | null | undefined) { return VULN[level ?? ''] ?? VULN['LOW']; }

/* ── Section wrapper ──────────────────────────────────────────────────────────── */
function Section({ title, icon, children, className = '' }: {
  title: string; icon: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`report-section ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <span
          className="material-symbols-outlined text-[18px] text-[var(--text-tertiary)]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────────── */
export default function ReportDetailClient({ report }: { report: any }) {
  const [copied, setCopied] = useState(false);

  /* Parse content */
  let c: any = null;
  try {
    c = typeof report.content === 'string' ? JSON.parse(report.content) : report.content;
  } catch { c = null; }

  const scenario = report.scenario;
  const place = scenario?.scenarioInterventions?.[0]?.intervention?.place ?? null;
  const vulnLevel: string | null = place?.vulnerabilityLevel ?? null;
  const vc = vl(vulnLevel);
  const sym: string = c?.stats?.currencySymbol ?? '₹';

  /* Key stats — try multiple field names */
  const tempReduction =
    c?.stats?.tempReductionC ??
    c?.keyStats?.tempReduction ??
    scenario?.totalProjectedTempReductionC ??
    null;
  const livesSaved =
    c?.stats?.livesSaved ??
    c?.keyStats?.livesSaved ??
    scenario?.totalProjectedLivesSaved ??
    null;
  const co2 =
    c?.stats?.co2ReductionTons ??
    c?.keyStats?.co2ReductionTons ??
    scenario?.projectedCo2ReductionTons ??
    null;
  const totalCost =
    c?.stats?.totalCostLocal ??
    c?.keyStats?.totalCostCrore ??
    c?.keyStats?.totalCost ??
    scenario?.totalEstimatedCostUsd ??
    null;
  const payback =
    c?.keyStats?.paybackYears ??
    c?.stats?.paybackYears ??
    null;

  const executiveSummary = safe(
    c?.executiveSummary, c?.executive_summary, c?.summary, ''
  );
  const heatProblem = safe(
    c?.whyThisPlaceNeedsAction, c?.why_this_place_needs_action, c?.heatProblem, ''
  );
  const impactText = safe(
    c?.impactProjections, c?.impactAnalysis, c?.impact_analysis, ''
  );
  const financialText = safe(
    c?.financialAnalysis, c?.financial_analysis, c?.fundingSources, ''
  );
  const implementationText = safe(
    c?.implementationPlan, c?.implementation_plan, ''
  );
  const monitoringText = safe(c?.monitoringPlan, c?.monitoring_plan, '');
  const recommendations: string | any[] =
    c?.recommendations ?? c?.nextSteps ?? c?.next_steps ?? '';
  const references: string | any[] = c?.references ?? '';
  const strategies: any[] = Array.isArray(c?.strategies) ? c.strategies : [];
  const timeline: any[] = Array.isArray(c?.implementationTimeline)
    ? c.implementationTimeline
    : Array.isArray(c?.implementation_timeline)
      ? c.implementation_timeline
      : [];

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const prev = document.title;
    document.title = report.title ?? 'Heat Mitigation Report';
    window.print();
    setTimeout(() => { document.title = prev; }, 3000);
  };

  /* No content guard */
  if (!c) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-5 px-4">
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center">
          <span className="material-symbols-outlined text-[var(--text-tertiary)] text-2xl">error_outline</span>
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Report content unavailable</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)] max-w-sm">
            The report data could not be loaded. This may happen if the scenario generation was interrupted.
            Please regenerate the scenario.
          </p>
        </div>
        {report.scenarioId && (
          <Link href={`/dashboard/scenarios/${report.scenarioId}`}
            className="px-5 py-2 bg-[var(--bg-surface)] border border-[rgba(34,197,94,0.35)] text-[#22c55e] text-sm font-semibold rounded-lg hover:bg-[rgba(34,197,94,0.06)] transition-colors">
            Go to Scenario
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Sticky action bar ─────────────────────────────────────────────────── */}
      <div
        className="report-action-bar sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 h-[52px] bg-[var(--bg-surface)] border-b border-[var(--border)]"
        data-no-print
      >
        {/* Back */}
        <Link
          href="/dashboard/reports"
          className="flex items-center gap-1 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span className="hidden sm:inline">Reports</span>
        </Link>

        {/* Title — hidden on mobile */}
        <span className="hidden sm:block flex-1 text-[13px] font-semibold text-[var(--text-primary)] truncate text-center px-2">
          {report.title}
        </span>
        <div className="flex-1 sm:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">link</span>
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share Link'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#22c55e] border border-[rgba(34,197,94,0.35)] rounded-lg hover:bg-[rgba(34,197,94,0.06)] transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">print</span>
            <span className="hidden sm:inline">Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* ── Report content ─────────────────────────────────────────────────────── */}
      <div className="report-content-area mx-auto px-4 sm:px-6 py-10" style={{ maxWidth: 780 }}>

        {/* ── SECTION 1: Header ── */}
        <div className="report-section mb-10 pb-8 border-b border-[var(--border)]">
          <div className="flex flex-wrap items-start gap-3 mb-2">
            <h1 className="text-[28px] font-bold tracking-tight text-[var(--text-primary)] leading-tight flex-1">
              {place?.name ?? scenario?.name ?? report.title}
            </h1>
            {vulnLevel && (
              <span
                className="shrink-0 mt-1 text-[11px] font-bold uppercase px-2.5 py-1 rounded-lg"
                style={{ background: vc.bg, color: vc.color, border: `1px solid ${vc.border}` }}
              >
                {vulnLevel}
              </span>
            )}
          </div>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">
            {report.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-tertiary)]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">calendar_today</span>
              Generated {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(report.generatedAt))}
            </span>
            <span>·</span>
            <span>HeatPlan AI</span>
            {report.status === 'PUBLISHED' && (
              <>
                <span>·</span>
                <span className="text-[#22c55e] font-medium">Published</span>
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 2: Key Metrics Strip ── */}
        <div className="report-section grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: 'Temp Reduction', value: tempReduction != null ? `${Number(tempReduction).toFixed(1)}°C` : '—', icon: 'thermostat', color: '#22c55e' },
            { label: 'Lives Protected / yr', value: livesSaved != null ? String(Math.round(Number(livesSaved))) : '—', icon: 'favorite', color: '#3b82f6' },
            { label: 'CO₂ Offset', value: co2 != null ? `${Number(co2).toFixed(1)} t/yr` : '—', icon: 'eco', color: '#10b981' },
            ...(payback != null
              ? [{ label: 'Payback Period', value: `${payback} yrs`, icon: 'payments', color: '#f59e0b' }]
              : [{ label: 'Total Investment', value: fmt(totalCost, sym), icon: 'payments', color: '#f59e0b' }]
            ),
          ].map((stat) => (
            <div key={stat.label}
              className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}
                >
                  {stat.icon}
                </span>
                <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  {stat.label}
                </span>
              </div>
              <span className="text-[22px] font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* ── SECTION 3: Executive Summary ── */}
        {executiveSummary && (
          <Section title="Executive Summary" icon="summarize" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {executiveSummary}
              </p>
            </div>
          </Section>
        )}

        {/* ── SECTION 4: The Heat Problem ── */}
        {heatProblem && (
          <Section title="The Heat Problem" icon="local_fire_department" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {heatProblem}
              </p>
            </div>
          </Section>
        )}

        {/* ── SECTION 5: Proposed Strategies ── */}
        {strategies.length > 0 && (
          <Section title="Proposed Cooling Strategies" icon="park" className="mb-8">
            <div className="flex flex-col gap-4">
              {strategies.map((s: any, i: number) => (
                <div key={i} className="report-strategy-card bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-[14px] font-bold text-[var(--text-primary)]">{s.name}</h3>
                      {s.type && (
                        <span className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] font-medium">
                          {String(s.type).replace(/_/g, ' ')}
                        </span>
                      )}
                      {s.location && (
                        <p className="text-[12px] italic text-[var(--text-tertiary)] mt-0.5">{s.location}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {s.totalCostLocal != null && (
                        <div className="text-[14px] font-bold text-[var(--text-primary)]">
                          {sym}{Number(s.totalCostLocal).toLocaleString()}
                        </div>
                      )}
                      {s.quantity != null && s.unitCostLocal != null && (
                        <div className="text-[10px] text-[var(--text-tertiary)]">
                          {s.quantity} × {sym}{Number(s.unitCostLocal).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  {s.description && (
                    <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">{s.description}</p>
                  )}
                  {/* Detail grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {s.coverageArea != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                        <div className="text-[var(--text-tertiary)] mb-0.5">Coverage</div>
                        <div className="font-medium text-[var(--text-primary)]">{s.coverageArea}</div>
                      </div>
                    )}
                    {s.tempReductionC != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                        <div className="text-[var(--text-tertiary)] mb-0.5">Cooling</div>
                        <div className="font-medium text-[#22c55e]">−{Number(s.tempReductionC).toFixed(2)}°C</div>
                      </div>
                    )}
                    {s.co2ReductionTons != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                        <div className="text-[var(--text-tertiary)] mb-0.5">CO₂ Offset</div>
                        <div className="font-medium text-[var(--text-primary)]">{Number(s.co2ReductionTons).toFixed(1)} t/yr</div>
                      </div>
                    )}
                    {s.beneficiaries != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                        <div className="text-[var(--text-tertiary)] mb-0.5">Beneficiaries</div>
                        <div className="font-medium text-[var(--text-primary)]">{Number(s.beneficiaries).toLocaleString()}</div>
                      </div>
                    )}
                    {s.timeline != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
                        <div className="text-[var(--text-tertiary)] mb-0.5">Timeline</div>
                        <div className="font-medium text-[var(--text-primary)]">{s.timeline}</div>
                      </div>
                    )}
                    {s.fundingSource != null && (
                      <div className="bg-[var(--bg-elevated)] rounded-lg px-3 py-2 col-span-2 sm:col-span-3">
                        <div className="text-[var(--text-tertiary)] mb-0.5">Funding Source</div>
                        <div className="font-medium text-[var(--text-primary)]">{s.fundingSource}</div>
                      </div>
                    )}
                  </div>
                  {s.placementNotes && (
                    <div className="mt-3 px-3 py-2 bg-[var(--bg-elevated)] rounded-lg text-[11px] text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">Placement note: </span>
                      {s.placementNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── SECTION 6: Combined Impact ── */}
        {impactText && (
          <Section title="Combined Impact" icon="analytics" className="mb-8">
            {/* Before/After comparison */}
            {(c?.currentTemp != null || c?.projectedTemp != null || c?.currentVulnerabilityLevel || c?.projectedVulnerabilityLevel) && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 rounded-xl p-4 border"
                  style={{ background: vl(c?.currentVulnerabilityLevel ?? vulnLevel).bg, borderColor: vl(c?.currentVulnerabilityLevel ?? vulnLevel).border }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">Before</div>
                  {c?.currentTemp != null && <div className="text-[20px] font-bold" style={{ color: vl(c?.currentVulnerabilityLevel ?? vulnLevel).color }}>{c.currentTemp}°C</div>}
                  {(c?.currentVulnerabilityLevel ?? vulnLevel) && (
                    <div className="text-[11px] font-semibold mt-0.5" style={{ color: vl(c?.currentVulnerabilityLevel ?? vulnLevel).color }}>
                      {c?.currentVulnerabilityLevel ?? vulnLevel}
                    </div>
                  )}
                </div>
                <div className="flex items-center text-[var(--text-tertiary)]">
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </div>
                <div className="flex-1 rounded-xl p-4 border"
                  style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">After</div>
                  {c?.projectedTemp != null && <div className="text-[20px] font-bold text-[#22c55e]">{c.projectedTemp}°C</div>}
                  {tempReduction != null && c?.projectedTemp == null && (
                    <div className="text-[20px] font-bold text-[#22c55e]">−{Number(tempReduction).toFixed(1)}°C</div>
                  )}
                  <div className="text-[11px] font-semibold mt-0.5 text-[#22c55e]">
                    {c?.projectedVulnerabilityLevel ?? 'Reduced Risk'}
                  </div>
                </div>
              </div>
            )}
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{impactText}</p>
            </div>
          </Section>
        )}

        {/* ── SECTION 7: Implementation Roadmap ── */}
        {(timeline.length > 0 || implementationText) && (
          <Section title="Implementation Roadmap" icon="timeline" className="mb-8">
            {timeline.length > 0 ? (
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[13px] top-7 bottom-7 w-px bg-[var(--border)]" />
                <div className="flex flex-col gap-0">
                  {timeline.map((phase: any, i: number) => (
                    <div key={i} className="report-timeline-item flex gap-4 pb-6 last:pb-0">
                      {/* Circle */}
                      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)] z-10">
                        {i + 1}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[13px] font-bold text-[var(--text-primary)]">
                            {phase.phase ?? phase.name ?? `Phase ${i + 1}`}
                          </span>
                          {(phase.duration ?? phase.timeline) && (
                            <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded px-1.5 py-0.5">
                              {phase.duration ?? phase.timeline}
                            </span>
                          )}
                        </div>
                        {Array.isArray(phase.activities) && phase.activities.length > 0 && (
                          <ul className="mt-1 mb-1.5 flex flex-col gap-0.5">
                            {phase.activities.map((a: string, j: number) => (
                              <li key={j} className="text-[12px] text-[var(--text-secondary)] flex gap-1.5">
                                <span className="text-[var(--text-tertiary)] shrink-0 mt-0.5">•</span>
                                <span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {phase.activities && !Array.isArray(phase.activities) && (
                          <p className="text-[12px] text-[var(--text-secondary)] mt-1 mb-1.5">{String(phase.activities)}</p>
                        )}
                        {(phase.milestone ?? phase.milestone_target) && (
                          <p className="text-[11px] italic text-[#22c55e]">
                            ✓ {phase.milestone ?? phase.milestone_target}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{implementationText}</p>
              </div>
            )}
          </Section>
        )}

        {/* ── SECTION 8: Funding Sources ── */}
        {financialText && (
          <Section title="Funding Sources" icon="account_balance" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{financialText}</p>
            </div>
          </Section>
        )}

        {/* ── SECTION 9: Recommendations / Next Steps ── */}
        {recommendations && (
          <Section title="Recommended Next Steps" icon="checklist" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
              {Array.isArray(recommendations) ? (
                <ol className="flex flex-col gap-3">
                  {recommendations.map((r: any, i: number) => {
                    const action = typeof r === 'string' ? r : (r.action ?? r.recommendation ?? r.step ?? JSON.stringify(r));
                    const timeline = typeof r === 'object' ? r.timeline : null;
                    const impact = typeof r === 'object' ? (r.expectedImpact ?? r.impact) : null;
                    return (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] flex items-center justify-center text-[10px] font-bold text-[var(--text-primary)] mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-[13px] text-[var(--text-primary)]">{action}</p>
                          <div className="flex flex-wrap gap-x-3 mt-0.5">
                            {timeline && <span className="text-[11px] text-[var(--text-tertiary)]">{timeline}</span>}
                            {impact && <span className="text-[11px] text-[var(--text-secondary)]">{impact}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{String(recommendations)}</p>
              )}
            </div>
          </Section>
        )}

        {/* ── SECTION 10: Monitoring Plan ── */}
        {monitoringText && (
          <Section title="Monitoring Plan" icon="monitoring" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6">
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{monitoringText}</p>
            </div>
          </Section>
        )}

        {/* ── SECTION 11: References ── */}
        {references && (Array.isArray(references) ? references.length > 0 : String(references).trim()) && (
          <Section title="References" icon="library_books" className="mb-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-5">
              {Array.isArray(references) ? (
                <ol className="flex flex-col gap-1.5 pl-4 list-decimal">
                  {references.map((ref: any, i: number) => (
                    <li key={i} className="text-[11px] text-[var(--text-tertiary)] pl-1">
                      {typeof ref === 'string' ? ref : (ref.citation ?? ref.text ?? JSON.stringify(ref))}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[11px] text-[var(--text-tertiary)] whitespace-pre-wrap">{String(references)}</p>
              )}
            </div>
          </Section>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 pt-6 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--text-tertiary)]" data-no-print>
          <span>HeatPlan · Urban Heat Intelligence Platform</span>
          <span>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(report.generatedAt))}</span>
        </div>
      </div>
    </>
  );
}

