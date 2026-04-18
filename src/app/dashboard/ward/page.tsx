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
        <span className="material-symbols-outlined animate-spin text-4xl text-[#69f6b8]">progress_activity</span>
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
          <p className="text-[#a3aac4] mt-1">Welcome, {session?.user?.name}. Manage your ward&apos;s heat reports and citizen complaints.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl btn-shine flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          New Report
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Reports Filed', value: reports.length, icon: 'description', color: '#699cff' },
          { label: 'Open Complaints', value: complaints.filter(c => c.status === 'NEW').length, icon: 'report_problem', color: '#ff8439' },
          { label: 'Avg Temperature', value: `${Math.round(reports.reduce((a, r) => a + r.temperature, 0) / reports.length)}°C`, icon: 'thermostat', color: '#ff716c' },
          { label: 'Resolved', value: complaints.filter(c => c.status === 'RESOLVED').length, icon: 'check_circle', color: '#69f6b8' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div className="text-2xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-[#6d758c] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Report Form */}
      {showForm && (
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Submit New Ward Report</h2>
          <form onSubmit={handleSubmitReport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Report Title</label>
              <input
                value={newReport.title}
                onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#69f6b8]/50 focus:outline-none"
                placeholder="Weekly Heat Report"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Zone</label>
              <input
                value={newReport.zone}
                onChange={(e) => setNewReport({ ...newReport, zone: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#69f6b8]/50 focus:outline-none"
                placeholder="Zone A"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Temperature (°C)</label>
              <input
                type="number"
                value={newReport.temperature}
                onChange={(e) => setNewReport({ ...newReport, temperature: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#69f6b8]/50 focus:outline-none"
                placeholder="42"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Notes</label>
              <input
                value={newReport.notes}
                onChange={(e) => setNewReport({ ...newReport, notes: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-[#69f6b8]/50 focus:outline-none"
                placeholder="Additional observations..."
              />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl btn-shine">
                Submit Report
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 glass-card rounded-xl text-[#a3aac4] hover:text-white transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#699cff]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          Ward Reports
        </h2>
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between glass-card rounded-xl px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[#699cff]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#699cff]" style={{ fontVariationSettings: "'FILL' 1" }}>article</span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{report.title}</div>
                  <div className="text-xs text-[#a3aac4] flex items-center gap-2">
                    <span>{report.zone}</span>
                    <span className="h-1 w-1 rounded-full bg-[#40485d]" />
                    <span>{report.date}</span>
                    <span className="h-1 w-1 rounded-full bg-[#40485d]" />
                    <span>{report.temperature}°C</span>
                  </div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                report.status === 'SUBMITTED' ? 'bg-[#699cff]/10 text-[#699cff]' :
                report.status === 'ACKNOWLEDGED' ? 'bg-[#69f6b8]/10 text-[#69f6b8]' :
                'bg-white/5 text-[#a3aac4]'
              }`}>{report.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Citizen Complaints */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ff8439]" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
          Citizen Complaints
        </h2>
        <div className="space-y-3">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="flex items-center justify-between glass-card rounded-xl px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  complaint.status === 'NEW' ? 'bg-[#ff8439]/10' :
                  complaint.status === 'ACKNOWLEDGED' ? 'bg-[#699cff]/10' : 'bg-[#69f6b8]/10'
                }`}>
                  <span className="material-symbols-outlined" style={{
                    color: complaint.status === 'NEW' ? '#ff8439' : complaint.status === 'ACKNOWLEDGED' ? '#699cff' : '#69f6b8',
                    fontVariationSettings: "'FILL' 1"
                  }}>
                    {complaint.status === 'RESOLVED' ? 'check_circle' : 'report'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{complaint.description}</div>
                  <div className="text-xs text-[#a3aac4] flex items-center gap-2">
                    <span>{complaint.location}</span>
                    <span className="h-1 w-1 rounded-full bg-[#40485d]" />
                    <span>{complaint.date}</span>
                  </div>
                </div>
              </div>
              {complaint.status === 'NEW' ? (
                <button
                  onClick={() => handleAcknowledge(complaint.id)}
                  className="px-3 py-1.5 bg-[#699cff]/10 text-[#699cff] rounded-lg text-xs font-bold hover:bg-[#699cff]/20 transition-all"
                >
                  Acknowledge
                </button>
              ) : (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  complaint.status === 'ACKNOWLEDGED' ? 'bg-[#699cff]/10 text-[#699cff]' : 'bg-[#69f6b8]/10 text-[#69f6b8]'
                }`}>{complaint.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
