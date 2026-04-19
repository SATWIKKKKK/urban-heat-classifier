'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface FieldSurvey {
  id: string;
  title: string;
  location: string;
  date: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  findings: string;
  photosCount: number;
}

export default function NGOFieldWorkerDashboard() {
  const { data: session } = useSession();
  const [surveys, setSurveys] = useState<FieldSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newSurvey, setNewSurvey] = useState({ title: '', location: '', findings: '' });

  useEffect(() => {
    setSurveys([
      { id: '1', title: 'Heat Stress Survey - Slum Area B', location: 'Dharavi, Mumbai', date: '2025-01-15', status: 'SUBMITTED', findings: 'High vulnerability due to tin roofs and lack of shade.', photosCount: 8 },
      { id: '2', title: 'Green Cover Assessment - Ward 7', location: 'Andheri East', date: '2025-01-13', status: 'REVIEWED', findings: 'Less than 5% tree canopy. Recommended 200 new saplings.', photosCount: 12 },
      { id: '3', title: 'Water Access Point Mapping', location: 'Kurla West', date: '2025-01-10', status: 'DRAFT', findings: 'Only 3 public drinking water points for 5000+ residents.', photosCount: 5 },
    ]);
    setLoading(false);
  }, []);

  function handleSubmitSurvey(e: React.FormEvent) {
    e.preventDefault();
    if (!newSurvey.title.trim() || !newSurvey.location.trim()) return;
    setSurveys(prev => [{
      id: Date.now().toString(),
      title: newSurvey.title,
      location: newSurvey.location,
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED',
      findings: newSurvey.findings,
      photosCount: 0,
    }, ...prev]);
    setNewSurvey({ title: '', location: '', findings: '' });
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
            Field Worker Dashboard
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Submit field surveys and ground-truth heat data.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl  flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          New Survey
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Surveys Submitted', value: surveys.filter(s => s.status !== 'DRAFT').length, icon: 'assignment_turned_in', color: 'var(--green-400)' },
          { label: 'Drafts', value: surveys.filter(s => s.status === 'DRAFT').length, icon: 'edit_note', color: 'var(--high)' },
          { label: 'Photos Uploaded', value: surveys.reduce((a, s) => a + s.photosCount, 0), icon: 'photo_camera', color: 'var(--info)' },
          { label: 'Reviewed', value: surveys.filter(s => s.status === 'REVIEWED').length, icon: 'verified', color: 'var(--critical)' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
            <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div className="text-2xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* New Survey Form */}
      {showForm && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h2 className="text-lg font-bold text-white mb-4">Submit Field Survey</h2>
          <form onSubmit={handleSubmitSurvey} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Survey Title</label>
                <input value={newSurvey.title} onChange={(e) => setNewSurvey({ ...newSurvey, title: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Heat Vulnerability Survey" required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Location</label>
                <input value={newSurvey.location} onChange={(e) => setNewSurvey({ ...newSurvey, location: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Ward name, Area" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Findings</label>
              <textarea
                value={newSurvey.findings}
                onChange={(e) => setNewSurvey({ ...newSurvey, findings: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl text-white focus:border-[var(--green-400)]/50 focus:outline-none resize-none"
                rows={3}
                placeholder="Describe your field observations..."
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">Submit Survey</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md text-[var(--text-secondary)] hover:text-white transition-all">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Surveys */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
          Field Surveys
        </h2>
        <div className="space-y-3">
          {surveys.map((survey) => (
            <div key={survey.id} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    survey.status === 'SUBMITTED' ? 'bg-[var(--info)]/10 text-[var(--info)]' :
                    survey.status === 'REVIEWED' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' :
                    'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                  }`}>{survey.status}</span>
                  <span className="text-white font-bold text-sm">{survey.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">photo_camera</span>
                    {survey.photosCount}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)]">{survey.date}</span>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{survey.findings}</p>
              <span className="text-xs text-[var(--info)] mt-2 inline-block">{survey.location}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
