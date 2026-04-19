'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface StateNote {
  id: string;
  title: string;
  city: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  date: string;
  summary: string;
}

interface CityOverview {
  name: string;
  temperature: number;
  alerts: number;
  interventions: number;
  status: string;
}

export default function SDMAObserverDashboard() {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<StateNote[]>([]);
  const [cities, setCities] = useState<CityOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState<{ title: string; city: string; severity: StateNote['severity']; summary: string }>({ title: '', city: '', severity: 'MEDIUM', summary: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setNotes([
      { id: '1', title: 'Heat Wave Alert - NCR Region', city: 'Delhi NCR', severity: 'CRITICAL', date: '2025-01-15', summary: 'Temperatures expected to cross 47°C. NDRF standby activated.' },
      { id: '2', title: 'Intervention Audit - Mumbai', city: 'Mumbai', severity: 'MEDIUM', date: '2025-01-14', summary: 'Cool roof installations behind schedule in ward zones 3-7.' },
      { id: '3', title: 'Water Supply Advisory - Chennai', city: 'Chennai', severity: 'HIGH', date: '2025-01-12', summary: 'Reservoir levels critical. May impact cooling station operations.' },
    ]);
    setCities([
      { name: 'Delhi NCR', temperature: 44, alerts: 3, interventions: 24, status: 'Critical' },
      { name: 'Mumbai', temperature: 36, alerts: 1, interventions: 18, status: 'Normal' },
      { name: 'Chennai', temperature: 39, alerts: 2, interventions: 15, status: 'Warning' },
      { name: 'Ahmedabad', temperature: 43, alerts: 2, interventions: 20, status: 'Critical' },
      { name: 'Nagpur', temperature: 45, alerts: 4, interventions: 12, status: 'Critical' },
    ]);
    setLoading(false);
  }, []);

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.title.trim() || !newNote.city.trim()) return;
    setNotes(prev => [{
      id: Date.now().toString(),
      ...newNote,
      date: new Date().toISOString().split('T')[0],
    }, ...prev]);
    setNewNote({ title: '', city: '', severity: 'MEDIUM', summary: '' });
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[var(--green-400)]">progress_activity</span>
      </div>
    );
  }

  const severityColor: Record<string, string> = {
    LOW: 'var(--green-400)', MEDIUM: 'var(--info)', HIGH: 'var(--high)', CRITICAL: 'var(--critical)',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
            SDMA Observer Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Monitor state-wide heat disaster preparedness.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl  flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">note_add</span>
          Add Note
        </button>
      </div>

      {/* City Overview Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
          State-Wide City Overview
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">City</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Temperature</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Active Alerts</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Interventions</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city) => (
                <tr key={city.name} className="border-b border-[var(--border)] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-white font-bold">{city.name}</td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${city.temperature >= 43 ? 'text-[var(--critical)]' : city.temperature >= 38 ? 'text-[var(--high)]' : 'text-[var(--green-400)]'}`}>
                      {city.temperature}°C
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{city.alerts}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{city.interventions}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      city.status === 'Critical' ? 'bg-[var(--critical)]/10 text-[var(--critical)]' :
                      city.status === 'Warning' ? 'bg-[var(--high)]/10 text-[var(--high)]' :
                      'bg-[var(--green-400)]/10 text-[var(--green-400)]'
                    }`}>{city.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Add Observer Note</h2>
          <form onSubmit={handleAddNote} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Title</label>
              <input value={newNote.title} onChange={(e) => setNewNote({ ...newNote, title: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Heat Advisory Note" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">City</label>
              <input value={newNote.city} onChange={(e) => setNewNote({ ...newNote, city: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Delhi NCR" required />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Severity</label>
              <select value={newNote.severity} onChange={(e) => setNewNote({ ...newNote, severity: e.target.value as StateNote['severity'] })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none appearance-none">
                <option value="LOW" className="bg-[var(--bg-base)]">Low</option>
                <option value="MEDIUM" className="bg-[var(--bg-base)]">Medium</option>
                <option value="HIGH" className="bg-[var(--bg-base)]">High</option>
                <option value="CRITICAL" className="bg-[var(--bg-base)]">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Summary</label>
              <input value={newNote.summary} onChange={(e) => setNewNote({ ...newNote, summary: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Brief observation..." />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">Add Note</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-white transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Observer Notes */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--high)]" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
          Observer Notes
        </h2>
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${severityColor[note.severity]}15`, color: severityColor[note.severity] }}>
                    {note.severity}
                  </span>
                  <span className="text-white font-bold text-sm">{note.title}</span>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{note.date}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{note.summary}</p>
              <span className="text-xs text-[var(--info)] mt-2 inline-block">{note.city}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
