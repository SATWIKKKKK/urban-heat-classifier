'use client';

import { useState } from 'react';
import { addNeighborhoodAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function AddNeighborhoodForm({ cityId }: { cityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const name = fd.get('name') as string;

    try {
      await addNeighborhoodAction({
        cityId,
        name,
        population: fd.get('population') ? Number(fd.get('population')) : undefined,
        areaSqkm: fd.get('areaSqkm') ? Number(fd.get('areaSqkm')) : undefined,
        medianIncome: fd.get('medianIncome') ? Number(fd.get('medianIncome')) : undefined,
        pctElderly: fd.get('pctElderly') ? Number(fd.get('pctElderly')) : undefined,
        pctChildren: fd.get('pctChildren') ? Number(fd.get('pctChildren')) : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError('Failed to add neighborhood');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-6 py-3 bg-gradient-to-br from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl self-start shadow-lg shadow-[var(--green-400)]/20 ">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Neighborhood
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-4">
      <h3 className="font-bold text-white text-lg">Add Neighborhood</h3>
      {error && <div className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Name *</label>
          <input name="name" required className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Population</label>
          <input name="population" type="number" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Area (km²)</label>
          <input name="areaSqkm" type="number" step="0.01" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Median Income ($)</label>
          <input name="medianIncome" type="number" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">% Elderly (65+)</label>
          <input name="pctElderly" type="number" step="0.1" min="0" max="100" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">% Children (0-14)</label>
          <input name="pctChildren" type="number" step="0.1" min="0" max="100" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>

      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-gradient-to-br from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl disabled:opacity-50 ">
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-6 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-elevated)] transition-all">
          Cancel
        </button>
      </div>
    </form>
  );
}
