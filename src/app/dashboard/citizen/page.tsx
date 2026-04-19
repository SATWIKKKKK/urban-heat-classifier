'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface CitizenReport {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
  category: string;
}

export default function CitizenReporterDashboard() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newReport, setNewReport] = useState({ title: '', description: '', location: '', category: 'HEAT_COMPLAINT' });

  useEffect(() => {
    setReports([
      { id: '1', title: 'No shade near school', description: 'Children walking 500m without any tree cover to reach school.', location: 'Ward 5, Sector 12', date: '2025-01-15', status: 'ACKNOWLEDGED', category: 'SHADE_REQUEST' },
      { id: '2', title: 'Broken water cooler', description: 'Public water cooler at bus stand not working for 2 weeks.', location: 'MG Road Bus Stop', date: '2025-01-13', status: 'IN_PROGRESS', category: 'INFRASTRUCTURE' },
      { id: '3', title: 'Heat illness cases', description: '3 elderly residents hospitalized due to heat stroke in our colony.', location: 'Rajendra Nagar', date: '2025-01-10', status: 'SUBMITTED', category: 'HEAT_COMPLAINT' },
    ]);
    setLoading(false);
  }, []);

  function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!newReport.title.trim() || !newReport.description.trim() || !newReport.location.trim()) return;
    setReports(prev => [{
      id: Date.now().toString(),
      title: newReport.title,
      description: newReport.description,
      location: newReport.location,
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      category: newReport.category,
    }, ...prev]);
    setNewReport({ title: '', description: '', location: '', category: 'HEAT_COMPLAINT' });
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[var(--green-400)]">progress_activity</span>
      </div>
    );
  }

  const statusConfig: Record<string, { color: string; icon: string }> = {
    SUBMITTED: { color: 'var(--high)', icon: 'schedule_send' },
    ACKNOWLEDGED: { color: 'var(--info)', icon: 'visibility' },
    IN_PROGRESS: { color: 'var(--moderate)', icon: 'engineering' },
    RESOLVED: { color: 'var(--green-400)', icon: 'check_circle' },
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            Citizen Reporter
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Report heat-related issues in your neighborhood.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl  flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">report</span>
          New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Reports Filed', value: reports.length, icon: 'description', color: 'var(--info)' },
          { label: 'Acknowledged', value: reports.filter(r => r.status === 'ACKNOWLEDGED').length, icon: 'visibility', color: 'var(--high)' },
          { label: 'In Progress', value: reports.filter(r => r.status === 'IN_PROGRESS').length, icon: 'engineering', color: 'var(--moderate)' },
          { label: 'Resolved', value: reports.filter(r => r.status === 'RESOLVED').length, icon: 'check_circle', color: 'var(--green-400)' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
            <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div className="text-2xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Report Form */}
      {showForm && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Report a Heat Issue</h2>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Title</label>
                <input value={newReport.title} onChange={(e) => setNewReport({ ...newReport, title: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Brief issue title" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Location</label>
                <input value={newReport.location} onChange={(e) => setNewReport({ ...newReport, location: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Area, Ward, Landmark" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Category</label>
              <select value={newReport.category} onChange={(e) => setNewReport({ ...newReport, category: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none appearance-none">
                <option value="HEAT_COMPLAINT" className="bg-[var(--bg-base)]">Heat Complaint</option>
                <option value="SHADE_REQUEST" className="bg-[var(--bg-base)]">Shade / Tree Request</option>
                <option value="INFRASTRUCTURE" className="bg-[var(--bg-base)]">Infrastructure Issue</option>
                <option value="WATER_ACCESS" className="bg-[var(--bg-base)]">Water Access Problem</option>
                <option value="OTHER" className="bg-[var(--bg-base)]">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Description</label>
              <textarea
                value={newReport.description}
                onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none resize-none"
                rows={3}
                placeholder="Describe the issue in detail..."
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">Submit Report</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-white transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Reports */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>list_alt</span>
          My Reports
        </h2>
        <div className="space-y-3">
          {reports.map((report) => {
            const config = statusConfig[report.status];
            return (
              <div key={report.id} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                      <span className="material-symbols-outlined text-sm" style={{ color: config.color, fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{report.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">{report.date}</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">{report.description}</p>
                <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">location_on</span>
                    {report.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">category</span>
                    {report.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-[var(--green-400)]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[var(--green-400)] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">How it works</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Submit a report about heat-related issues in your area. Your ward officer will acknowledge it and take action.
              You can track the status of your reports here. Reports marked as &quot;Resolved&quot; have been addressed by the authorities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
