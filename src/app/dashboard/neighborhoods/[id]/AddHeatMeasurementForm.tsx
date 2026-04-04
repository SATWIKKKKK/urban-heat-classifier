'use client';

import { useState } from 'react';
import { addHeatMeasurementAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function AddHeatMeasurementForm({ neighborhoodId }: { neighborhoodId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);

    try {
      await addHeatMeasurementAction({
        neighborhoodId,
        measurementDate: new Date(fd.get('measurementDate') as string).toISOString(),
        avgTempCelsius: Number(fd.get('avgTempCelsius')),
        maxTempCelsius: Number(fd.get('maxTempCelsius')),
        minTempCelsius: fd.get('minTempCelsius') ? Number(fd.get('minTempCelsius')) : undefined,
        dataSource: (fd.get('dataSource') as string) || undefined,
      });
      setOpen(false);
      router.refresh();
    } catch {
      setError('Failed to add measurement');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-5 py-2 bg-[#ff8439] text-white font-bold rounded-md text-sm self-start">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">thermostat</span>
          Record Heat Measurement
        </span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-6 rounded-xl space-y-4">
      <h3 className="font-bold text-white text-lg">Record Heat Measurement</h3>
      {error && <div className="text-sm text-red-400 bg-red-400/10 px-4 py-2 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#a3aac4] mb-1">Date *</label>
          <input name="measurementDate" type="date" required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#a3aac4] mb-1">Avg Temp (°C) *</label>
          <input name="avgTempCelsius" type="number" step="0.1" required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#a3aac4] mb-1">Max Temp (°C) *</label>
          <input name="maxTempCelsius" type="number" step="0.1" required className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#a3aac4] mb-1">Min Temp (°C)</label>
          <input name="minTempCelsius" type="number" step="0.1" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-[#a3aac4] mb-1">Source</label>
          <input name="dataSource" placeholder="e.g., NOAA, Manual" className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="px-6 py-2 bg-[#ff8439] text-white font-bold rounded-md disabled:opacity-50">
          {loading ? 'Saving...' : 'Save Measurement'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-6 py-2 border border-white/10 text-[#a3aac4] rounded-md hover:bg-white/5">
          Cancel
        </button>
      </div>
    </form>
  );
}
