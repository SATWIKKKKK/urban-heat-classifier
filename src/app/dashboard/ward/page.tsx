'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface WardReport {
  id: string;
  title: string;
  zone: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
  temperature: number;
  complaints: number;
}

interface CitizenComplaint {
  id: string;
  reporter: string;
  description: string;
  location: string;
  date: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export default function WardOfficerDashboard() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<WardReport[]>([]);
  const [complaints, setComplaints] = useState<CitizenComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReport, setNewReport] = useState({ title: '', zone: '', temperature: '', notes: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setReports([
      { id: '1', title: 'Weekly Heat Report - Zone A', zone: 'Zone A', date: '2025-01-15', status: 'SUBMITTED', temperature: 42, complaints: 8 },
      { id: '2', title: 'Critical Alert - Zone A Market', zone: 'Zone A', date: '2025-01-14', status: 'ACKNOWLEDGED', temperature: 45, complaints: 15 },
      { id: '3', title: 'Monthly Summary - December', zone: 'Zone A', date: '2025-01-01', status: 'DRAFT', temperature: 38, complaints: 3 },
    ]);
    setComplaints([
      { id: '1', reporter: 'Resident', description: 'No shade near bus stop on MG Road', location: 'MG Road, Ward 5', date: '2025-01-15', status: 'NEW' },
      { id: '2', reporter: 'Resident', description: 'Park trees dried up, no water supply', location: 'Gandhi Park, Ward 5', date: '2025-01-14', status: 'ACKNOWLEDGED' },
      { id: '3', reporter: 'NGO Worker', description: 'Construction site increasing local temperature', location: 'Sector 12', date: '2025-01-13', status: 'RESOLVED' },
    ]);
    setLoading(false);
  }, []);

  function handleAcknowledge(id: string) {
    setComplaints(prev =>
      prev.map(c => c.id === id ? { ...c, status: 'ACKNOWLEDGED' as const } : c)
    );
  }

  function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!newReport.title.trim() || !newReport.zone.trim()) return;
    setReports(prev => [{
      id: Date.now().toString(),
      title: newReport.title,
      zone: newReport.zone,
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      temperature: Number(newReport.temperature) || 0,
      complaints: 0,
    }, ...prev]);
    setNewReport({ title: '', zone: '', temperature: '', notes: '' });
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[var(--green-400)]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            Ward Officer Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Manage your ward&apos;s heat reports and citizen complaints.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl  flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Reports Filed', value: reports.length, icon: 'description', color: 'var(--info)' },
          { label: 'Open Complaints', value: complaints.filter(c => c.status === 'NEW').length, icon: 'report_problem', color: 'var(--high)' },
          { label: 'Avg Temperature', value: `${Math.round(reports.reduce((a, r) => a + r.temperature, 0) / reports.length)}°C`, icon: 'thermostat', color: 'var(--critical)' },
          { label: 'Resolved', value: complaints.filter(c => c.status === 'RESOLVED').length, icon: 'check_circle', color: 'var(--green-400)' },
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
          <h2 className="text-lg font-bold text-white mb-4">Submit New Ward Report</h2>
          <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Report Title</label>
              <input
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none"
                placeholder="Weekly Heat Report"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Zone</label>
              <input
                value={newReport.zone}
                onChange={(e) => setNewReport({ ...newReport, zone: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none"
                placeholder="Zone A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Temperature (°C)</label>
              <input
                type="number"
                value={newReport.temperature}
                onChange={(e) => setNewReport({ ...newReport, temperature: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none"
                placeholder="42"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Notes</label>
              <input
                value={newReport.notes}
                onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none"
                placeholder="Additional observations..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">
                Submit Report
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-white transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          Ward Reports
        </h2>
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[var(--info)]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>article</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{report.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    <span>{report.zone}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{report.date}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{report.temperature}°C</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                report.status === 'SUBMITTED' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
                report.status === 'ACKNOWLEDGED' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}>{report.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Citizen Complaints */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--high)]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
          Citizen Complaints
        </h2>
        <div className="space-y-3">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  complaint.status === 'NEW' ? 'bg-[var(--high)]/10' :
                  complaint.status === 'ACKNOWLEDGED' ? 'bg-[var(--info)]/10' : 'bg-[var(--green-400)]/10'
                }`}>
                  <span className="material-symbols-outlined" style={{
                    color: complaint.status === 'NEW' ? 'var(--high)' : complaint.status === 'ACKNOWLEDGED' ? 'var(--info)' : 'var(--green-400)',
                    fontVariationSettings: "'FILL' 1"
                  }}>
                    {complaint.status === 'RESOLVED' ? 'check_circle' : 'report'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{complaint.description}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    <span>{complaint.location}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{complaint.date}</span>
                  </div>
                </div>
              </div>
              {complaint.status === 'NEW' ? (
                <button
                  onClick={() => handleAcknowledge(complaint.id)}
                  className="px-3 py-1.5 bg-[var(--info)]/10 text-[var(--info)] rounded-lg text-xs font-bold hover:bg-[var(--info)]/20 transition-all"
                >
                  Acknowledge
                </button>
              ) : (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  complaint.status === 'ACKNOWLEDGED' ? 'bg-[var(--info)]/10 text-[var(--info)]' : 'bg-[var(--green-400)]/10 text-[var(--green-400)]'
                }`}>{complaint.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
