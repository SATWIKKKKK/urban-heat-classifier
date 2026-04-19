'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addInterventionAction } from '@/lib/actions';
import Link from 'next/link';

const INTERVENTION_TYPES = [
  'TREE_PLANTING',
  'GREEN_ROOF',
  'COOL_PAVEMENT',
  'COOL_ROOF',
  'PERMEABLE_PAVEMENT',
  'URBAN_GARDEN',
  'MIST_STATION',
];

interface Place { id: string; name: string }

export default function NewInterventionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [geminiRecs, setGeminiRecs] = useState<string | null>(null);

  // Pre-fill from query params (from Gemini recommendation)
  const prefillName = searchParams.get('name') ?? '';
  const prefillType = searchParams.get('type') ?? '';
  const prefillPlaceId = searchParams.get('placeId') ?? '';
  const prefillCost = searchParams.get('cost') ?? '';
  const prefillReduction = searchParams.get('reduction') ?? '';
  const prefillDescription = searchParams.get('description') ?? '';
  const prefillPlaceName = searchParams.get('placeName') ?? '';

  useEffect(() => {
    // Fetch places for dropdown
    fetch('/api/places')
      .then((r) => r.json())
      .then((data) => setPlaces(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Auto-fetch Gemini recommendation if placeName provided
  useEffect(() => {
    if (prefillPlaceName && !geminiRecs) {
      fetch('/api/ai/place-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeName: prefillPlaceName, lat: 0, lng: 0 }),
      })
        .then((r) => r.json())
        .then((data) => setGeminiRecs(data.report ?? null))
        .catch(() => {});
    }
  }, [prefillPlaceName, geminiRecs]);

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
        estimatedTempReductionC: fd.get('reduction') ? Number(fd.get('reduction')) : undefined,
      });
      router.push('/dashboard/interventions');
      router.refresh();
    } catch {
      setError('Failed to create intervention');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard/interventions" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">New Intervention</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Add a heat mitigation intervention to your city plan.</p>
        </div>
      </div>

      {error && <div className="mb-4 px-4 py-2 text-sm bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">{error}</div>}

      {geminiRecs && (
        <div className="mb-6 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
          <h3 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>AI Recommendations for {prefillPlaceName}
          </h3>
          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">{geminiRecs}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
          <input name="name" required defaultValue={prefillName} placeholder="e.g. Memorial Park Tree Planting"
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type *</label>
            <select name="type" required defaultValue={prefillType}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]">
              <option value="">Select type</option>
              {INTERVENTION_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Place</label>
            <select name="placeId" defaultValue={prefillPlaceId}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]">
              <option value="">City-wide</option>
              {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
          <textarea name="description" rows={3} defaultValue={prefillDescription} placeholder="Describe the intervention..."
            className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Estimated Cost (USD)</label>
            <input name="cost" type="number" step="0.01" defaultValue={prefillCost} placeholder="e.g. 50000"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expected Temp Reduction (°C)</label>
            <input name="reduction" type="number" step="0.1" defaultValue={prefillReduction} placeholder="e.g. 1.5"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link href="/dashboard/interventions" className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-elevated)]">Cancel</Link>
          <button type="submit" disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-[var(--green-400)] text-[var(--bg-base)] rounded-lg hover:opacity-90 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Intervention'}
          </button>
        </div>
      </form>
    </div>
  );
}
