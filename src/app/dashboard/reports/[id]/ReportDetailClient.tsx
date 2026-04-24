'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ReportDetailClient({ report, download }: { report: any; download: boolean }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'impact' | 'implementation'>('overview');
  
  useEffect(() => {
    if (download && report.content) {
      document.title = report.title || 'Report';
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [download, report]);

  if (!report.content) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <span className="material-symbols-outlined text-neutral-500">article</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Report content not available</h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">This report was generated but no content was saved. You need to regenerate it from the scenario.</p>
        </div>
        {report.scenarioId ? (
          <Link href={`/dashboard/scenarios/${report.scenarioId}`} className="px-4 py-2 bg-[#22c55e] text-white text-sm font-semibold rounded-lg hover:bg-[#16a34a] transition-colors">
            Go to Scenario
          </Link>
        ) : null}
      </div>
    );
  }

  let contentData: any = {};
  try {
    contentData = JSON.parse(report.content);
  } catch (e) {}

  const scenario = report.scenario;
  const place = scenario?.scenarioInterventions?.[0]?.intervention?.place;
  const sym = contentData?.stats?.currencySymbol ?? '$';
  const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : (n ?? 0).toFixed(0);

  const triggerDownload = () => {
    document.title = report.title || 'Report';
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
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

      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Page header (above the report) */}
        <div className="flex items-center justify-between no-print">
          <div className="flex flex-col gap-1">
            <Link href="/dashboard/reports" className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 mb-1 w-fit">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Reports
            </Link>
            <h1 className="text-2xl font-bold text-white tracking-tight">{report.title}</h1>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              {place && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                  {place.name}
                  {place.vulnerabilityLevel && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style={{
                      backgroundColor: place.vulnerabilityLevel === 'CRITICAL' ? 'rgba(239,68,68,0.2)' :
                                       place.vulnerabilityLevel === 'HIGH' ? 'rgba(249,115,22,0.2)' :
                                       place.vulnerabilityLevel === 'MODERATE' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                      color: place.vulnerabilityLevel === 'CRITICAL' ? '#ef4444' :
                             place.vulnerabilityLevel === 'HIGH' ? '#f97316' :
                             place.vulnerabilityLevel === 'MODERATE' ? '#eab308' : '#22c55e',
                    }}>
                      {place.vulnerabilityLevel}
                    </span>
                  )}
                </div>
              )}
              <span>•</span>
              <span>Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={triggerDownload} className="px-4 py-2 bg-[#22c55e] text-white text-sm font-semibold rounded-lg hover:bg-[#16a34a] transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Download PDF
          </button>
        </div>

        {/* Stats hero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
          {[
            { label: 'Temp Reduction', value: `${contentData?.stats?.tempReductionC?.toFixed(1) ?? scenario?.totalProjectedTempReductionC?.toFixed(1) ?? '0'}°C`, color: '#22c55e', icon: 'thermostat' },
            { label: 'Lives Saved/yr', value: `${contentData?.stats?.livesSaved?.toFixed(0) ?? scenario?.totalProjectedLivesSaved ?? '0'}`, color: '#3b82f6', icon: 'favorite' },
            { label: 'CO₂ Offset', value: `${contentData?.stats?.co2ReductionTons?.toFixed(1) ?? scenario?.projectedCo2ReductionTons?.toFixed(1) ?? '0'} t/yr`, color: '#10b981', icon: 'eco' },
            { label: 'Total Cost', value: `${sym}${fmt(contentData?.stats?.totalCostLocal ?? scenario?.totalEstimatedCostUsd ?? 0)}`, color: '#f59e0b', icon: 'payments' },
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

        {/* Tabs */}
        <div className="flex gap-1 no-print overflow-x-auto">
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
          {(activeTab === 'overview' || (typeof window !== 'undefined' && window.matchMedia?.('print')?.matches)) && (
            <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
              <h2 className="text-lg font-semibold text-white mb-1">{scenario?.name || report.title}</h2>
              {scenario?.description && <p className="text-sm text-neutral-400 mb-4">{scenario.description}</p>}
              <div className="prose prose-sm prose-invert max-w-none">
                <h3 className="text-sm font-semibold text-white mt-4 mb-2">Executive Summary</h3>
                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{contentData.executiveSummary}</div>
              </div>
            </div>
          )}

          {/* Strategies tab */}
          {(activeTab === 'strategies' || (typeof window !== 'undefined' && window.matchMedia?.('print')?.matches)) && contentData?.strategies && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white mb-3 no-print">Proposed Strategies</h3>
              {contentData.strategies.map((strategy: any, i: number) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#111113] p-4 print-break">
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
          {(activeTab === 'impact' || (typeof window !== 'undefined' && window.matchMedia?.('print')?.matches)) && (
            <div className="space-y-4 print-break">
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Impact Analysis</h3>
                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{contentData.impactAnalysis}</div>
              </div>
              {contentData.riskFactors?.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Risk Factors</h3>
                  <div className="space-y-2">
                    {contentData.riskFactors.map((risk: string, i: number) => (
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
          {(activeTab === 'implementation' || (typeof window !== 'undefined' && window.matchMedia?.('print')?.matches)) && (
            <div className="space-y-4 print-break">
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Implementation Plan</h3>
                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{contentData.implementationPlan}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Recommendations</h3>
                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{contentData.recommendations}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-[#111113] p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Monitoring Plan</h3>
                <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{contentData.monitoringPlan}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
