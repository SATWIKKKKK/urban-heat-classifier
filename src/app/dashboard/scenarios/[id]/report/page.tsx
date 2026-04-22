'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReportContent {
  executiveSummary: string;
  impactAnalysis: string;
  implementationPlan: string;
  recommendations: string;
  riskFactors: string[];
  monitoringPlan: string;
  strategies: Array<{
    type: string;
    name: string;
    description: string;
    quantity: number;
    unitCostLocal: number;
    totalCostLocal: number;
    tempReductionC: number;
    co2ReductionTons: number;
    placementNotes: string;
  }>;
  stats: {
    totalCostLocal: number;
    currencyCode: string;
    currencySymbol: string;
    tempReductionC: number;
    livesSaved: number;
    co2ReductionTons: number;
    energySavingsKwh: number;
    costBenefitRatio: number;
    timelineMonths: number;
  };
  variant: 'scenarioA' | 'scenarioB';
}

interface ScenarioData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string | null;
  totalEstimatedCostUsd: number | null;
  totalProjectedTempReductionC: number | null;
  totalProjectedLivesSaved: number | null;
  projectedCo2ReductionTons: number | null;
  city: { name: string; state: string | null; country: string | null };
  reports: Array<{ id: string; title: string; content: string | null }>;
  createdAt: string;
}

export default function ScenarioReportPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [report, setReport] = useState<ReportContent | null>(null);
  const [altScenarioId, setAltScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'impact' | 'implementation'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scenarioId) return;
    fetch(`/api/scenarios/${scenarioId}`)
      .then(r => r.json())
      .then(data => {
        setScenario(data);
        if (data.reports?.[0]?.content) {
          try {
            setReport(JSON.parse(data.reports[0].content));
          } catch { /* ignore */ }
        }
        // Find the sibling scenario (A/B pair created at same time)
        if (data.siblingScenarioId) {
          setAltScenarioId(data.siblingScenarioId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scenarioId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e]/30 border-t-[#22c55e] rounded-full animate-spin" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-600 mb-3">search_off</span>
          <p className="text-neutral-400 mb-4">Scenario not found</p>
          <Link href="/dashboard/scenarios" className="text-sm text-[#22c55e] hover:underline">Back to Scenarios</Link>
        </div>
      </div>
    );
  }

  const sym = report?.stats?.currencySymbol ?? '$';
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);

  return (
    <>
      {/* Print-optimized styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .bg-\\[\\#09090b\\] { background: white !important; }
          .text-white { color: black !important; }
          .text-neutral-400, .text-neutral-500, .text-neutral-600 { color: #666 !important; }
          .border-white\\/\\[0\\.06\\] { border-color: #ddd !important; }
          .bg-\\[\\#111113\\] { background: #f9f9f9 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-[#09090b]">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.06] no-print">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/scenarios" className="text-neutral-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </Link>
              <div>
                <h1 className="text-sm font-semibold text-white">{scenario.name}</h1>
                <p className="text-[11px] text-neutral-500">{scenario.city.name}{scenario.city.state ? `, ${scenario.city.state}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {altScenarioId && (
                <button
                  onClick={() => router.push(`/dashboard/scenarios/${altScenarioId}/report`)}
                  className="px-3 h-8 text-xs font-medium text-neutral-300 bg-[#111113] border border-white/[0.08] rounded-lg hover:bg-white/[0.04] transition-colors"
                >
                  View Alternative
                </button>
              )}
              <a
                href={`/api/scenarios/${scenario.id}/council-brief`}
                className="px-4 h-8 text-xs font-semibold bg-[#22c55e] text-white rounded-lg hover:bg-[#16a34a] transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">download</span>Download PDF
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Stats hero */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Temp Reduction', value: `${report?.stats?.tempReductionC?.toFixed(1) ?? scenario.totalProjectedTempReductionC?.toFixed(1) ?? '0'}°C`, color: '#22c55e', icon: 'thermostat' },
              { label: 'Lives Saved/yr', value: `${report?.stats?.livesSaved?.toFixed(0) ?? scenario.totalProjectedLivesSaved ?? '0'}`, color: '#3b82f6', icon: 'favorite' },
              { label: 'CO₂ Offset', value: `${report?.stats?.co2ReductionTons?.toFixed(1) ?? scenario.projectedCo2ReductionTons?.toFixed(1) ?? '0'} t/yr`, color: '#10b981', icon: 'eco' },
              { label: 'Total Cost', value: `${sym}${fmt(report?.stats?.totalCostLocal ?? scenario.totalEstimatedCostUsd ?? 0)}`, color: '#f59e0b', icon: 'payments' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#111113] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-base" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Additional stats row */}
          {report?.stats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg border border-white/[0.06] bg-[#111113] p-3 text-center">
                <div className="text-sm font-semibold text-white">{report.stats.costBenefitRatio?.toFixed(1) ?? '0'}:1</div>
                <div className="text-[10px] text-neutral-500">Cost-Benefit Ratio</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-[#111113] p-3 text-center">
                <div className="text-sm font-semibold text-white">{fmt(report.stats.energySavingsKwh ?? 0)} kWh</div>
                <div className="text-[10px] text-neutral-500">Energy Savings/yr</div>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-[#111113] p-3 text-center">
                <div className="text-sm font-semibold text-white">{report.stats.timelineMonths ?? '12'} months</div>
                <div className="text-[10px] text-neutral-500">Timeline</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 no-print overflow-x-auto">
            {([
              { key: 'overview', label: 'Overview', icon: 'description' },
              { key: 'strategies', label: 'Strategies', icon: 'category' },
              { key: 'impact', label: 'Impact Analysis', icon: 'analytics' },
              { key: 'implementation', label: 'Implementation', icon: 'timeline' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-[#22c55e] text-white'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}>
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Overview tab */}
            {(activeTab === 'overview' || typeof window !== 'undefined' && window.matchMedia?.('print')?.matches) && report && (
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                <h2 className="text-lg font-semibold text-white mb-1">{scenario.name}</h2>
                {scenario.description && <p className="text-sm text-neutral-400 mb-4">{scenario.description}</p>}
                <div className="prose prose-sm prose-invert max-w-none">
                  <h3 className="text-sm font-semibold text-white mt-4 mb-2">Executive Summary</h3>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.executiveSummary}</div>
                </div>
              </div>
            )}

            {/* Strategies tab */}
            {(activeTab === 'strategies') && report?.strategies && (
              <div className="space-y-3">
                {report.strategies.map((strategy, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.06] bg-[#111113] p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{strategy.name}</h3>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">{strategy.type.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">{sym}{strategy.totalCostLocal?.toLocaleString()}</div>
                        <div className="text-[10px] text-neutral-500">{strategy.quantity} units × {sym}{strategy.unitCostLocal?.toLocaleString()}</div>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 mb-3">{strategy.description}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#09090b] px-3 py-2"><span className="text-neutral-500">Cooling</span> <span className="font-medium text-[#22c55e] ml-1">-{strategy.tempReductionC?.toFixed(2)}°C</span></div>
                      <div className="rounded-lg bg-[#09090b] px-3 py-2"><span className="text-neutral-500">CO₂</span> <span className="font-medium text-white ml-1">-{strategy.co2ReductionTons?.toFixed(1)} t/yr</span></div>
                    </div>
                    {strategy.placementNotes && (
                      <div className="mt-3 text-[11px] text-neutral-500 bg-[#09090b] rounded-lg p-3">
                        <span className="font-medium text-neutral-400">Placement: </span>{strategy.placementNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Impact tab */}
            {(activeTab === 'impact') && report && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Impact Analysis</h3>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.impactAnalysis}</div>
                </div>
                {report.riskFactors?.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                    <h3 className="text-sm font-semibold text-white mb-3">Risk Factors</h3>
                    <div className="space-y-2">
                      {report.riskFactors.map((risk, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="material-symbols-outlined text-orange-400 text-base mt-0.5">warning</span>
                          <span className="text-neutral-300">{risk}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Implementation tab */}
            {(activeTab === 'implementation') && report && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Implementation Plan</h3>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.implementationPlan}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.recommendations}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Monitoring Plan</h3>
                  <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{report.monitoringPlan}</div>
                </div>
              </div>
            )}

            {/* Fallback when no report content */}
            {!report && (
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-8 text-center">
                <span className="material-symbols-outlined text-3xl text-neutral-600 mb-2">article</span>
                <p className="text-sm text-neutral-400">No detailed report available for this scenario.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
