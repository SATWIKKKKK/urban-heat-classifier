'use client';

import { useState, useEffect } from 'react';
import { addInterventionAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

const INTERVENTION_TYPES = [
  'TREE_PLANTING',
  'GREEN_ROOF',
  'COOL_PAVEMENT',
  'COOL_ROOF',
  'PERMEABLE_PAVEMENT',
  'URBAN_GARDEN',
  'MIST_STATION',
];

interface Place {
  id: string;
  name: string;
}

export default function AddInterventionForm({ cityId }: { cityId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);

  useEffect(() => {
    if (open) {
      fetch(`/api/places?cityId=${encodeURIComponent(cityId)}`)
        .then((r) => r.json())
        .then((data) => setPlaces(data ?? []))
        .catch(() => {});
    }
  }, [open, cityId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);

    try {
      await addInterventionAction({
        name: fd.get('name') as string,
        type: fd.get('type') as string,
        placeId: (fd.get('placeId') as string) || undefined,
        description: (fd.get('description') as string) || undefined,
        estimatedCostUsd: fd.get('cost') ? Number(fd.get('cost')) : undefined,
        estimatedTempReductionC: fd.get('tempReduction') ? Number(fd.get('tempReduction')) : undefined,
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError('Failed to add intervention');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-6 py-3 bg-gradient-to-br from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl self-start shadow-lg shadow-[var(--green-400)]/20 ">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Intervention
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-4">
      <h3 className="font-bold text-white text-lg">Add Intervention</h3>
      {error && <div className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Name *</label>
          <input name="name" required className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Type *</label>
          <select name="type" required className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none">
            {INTERVENTION_TYPES.map((t) => (
              <option key={t} value={t} className="bg-[var(--bg-base)]">{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Place</label>
          <select name="placeId" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none">
            <option value="" className="bg-[var(--bg-base)]">City-wide</option>
            {places.map((n) => (
              <option key={n.id} value={n.id} className="bg-[var(--bg-base)]">{n.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Estimated Cost ($)</label>
          <input name="cost" type="number" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Est. Temp Reduction (°C)</label>
          <input name="tempReduction" type="number" step="0.1" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
        </div>
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-xs text-[var(--text-secondary)] mb-1">Description</label>
          <input name="description" className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none" />
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
