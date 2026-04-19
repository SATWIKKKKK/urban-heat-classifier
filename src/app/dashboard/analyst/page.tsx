'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface DataSource {
  id: string;
  name: string;
  type: 'CSV' | 'API' | 'SATELLITE' | 'MANUAL';
  lastUpdated: string;
  records: number;
  status: 'ACTIVE' | 'STALE' | 'ERROR';
}

interface AnalysisReport {
  id: string;
  title: string;
  date: string;
  type: string;
  status: 'GENERATED' | 'PENDING' | 'FAILED';
}

export default function DataAnalystDashboard() {
  const { data: session } = useSession();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setDataSources([
      { id: '1', name: 'IMD Temperature Feed', type: 'API', lastUpdated: '2025-01-15', records: 15420, status: 'ACTIVE' },
      { id: '2', name: 'ISRO Landsat Imagery', type: 'SATELLITE', lastUpdated: '2025-01-14', records: 892, status: 'ACTIVE' },
      { id: '3', name: 'Census Ward Demographics', type: 'CSV', lastUpdated: '2024-12-01', records: 4500, status: 'STALE' },
      { id: '4', name: 'NOAA Historical Data', type: 'API', lastUpdated: '2025-01-10', records: 28000, status: 'ACTIVE' },
      { id: '5', name: 'Manual Field Readings', type: 'MANUAL', lastUpdated: '2025-01-15', records: 340, status: 'ACTIVE' },
    ]);
    setReports([
      { id: '1', title: 'Q4 Heat Vulnerability Analysis', date: '2025-01-15', type: 'Vulnerability', status: 'GENERATED' },
      { id: '2', title: 'Intervention Effectiveness Report', date: '2025-01-14', type: 'Impact', status: 'GENERATED' },
      { id: '3', title: 'Ward-wise Temperature Trends', date: '2025-01-13', type: 'Trend', status: 'PENDING' },
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[var(--green-400)]">progress_activity</span>
      </div>
    );
  }

  const totalRecords = dataSources.reduce((a, d) => a + d.records, 0);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
          Data Analyst Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Manage data sources, run analyses, and generate reports.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Data Sources', value: dataSources.length, icon: 'database', color: 'var(--info)' },
          { label: 'Total Records', value: totalRecords.toLocaleString(), icon: 'dataset', color: 'var(--green-400)' },
          { label: 'Reports Generated', value: reports.filter(r => r.status === 'GENERATED').length, icon: 'analytics', color: 'var(--high)' },
          { label: 'Active Feeds', value: dataSources.filter(d => d.status === 'ACTIVE').length, icon: 'rss_feed', color: 'var(--critical)' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
            <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div className="text-2xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Data Sources */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>storage</span>
          Data Sources
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Source</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Type</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Records</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Last Updated</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {dataSources.map((source) => (
                <tr key={source.id} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white font-bold">{source.name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{source.type}</span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{source.records.toLocaleString()}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{source.lastUpdated}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      source.status === 'ACTIVE' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                      source.status === 'STALE' ? 'bg-[var(--high)]/10 text-[var(--high)]' :
                      'bg-[var(--critical)]/10 text-[var(--critical)]'
                    }`}>{source.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis Reports */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--high)]" style={{ fontVariationSettings: "'FILL' 1" }}>assessment</span>
          Analysis Reports
        </h2>
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  report.status === 'GENERATED' ? 'bg-[var(--green-400)]/10' :
                  report.status === 'PENDING' ? 'bg-[var(--high)]/10' : 'bg-[var(--critical)]/10'
                }`}>
                  <span className="material-symbols-outlined" style={{
                    color: report.status === 'GENERATED' ? 'var(--green-400)' : report.status === 'PENDING' ? 'var(--high)' : 'var(--critical)',
                    fontVariationSettings: "'FILL' 1"
                  }}>
                    {report.status === 'GENERATED' ? 'check_circle' : report.status === 'PENDING' ? 'hourglass_top' : 'error'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{report.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    <span>{report.type}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{report.date}</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                report.status === 'GENERATED' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                report.status === 'PENDING' ? 'bg-[var(--high)]/10 text-[var(--high)]' :
                'bg-[var(--critical)]/10 text-[var(--critical)]'
              }`}>{report.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
