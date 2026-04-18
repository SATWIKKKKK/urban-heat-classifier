'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DataManagementPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'csv' | 'geojson' | 'weather'>('csv');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setResult(null);

    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File;
    if (!file?.name) {
      setResult({ success: false, message: 'Please select a file' });
      setUploading(false);
      return;
    }

    const text = await file.text();

    try {
      const res = await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeTab,
          content: text,
          fileName: file.name,
          cityId: session?.user?.cityId,
        }),
      });
      const data = await res.json();
      setResult({ success: res.ok, message: data.message || (res.ok ? 'Import successful' : 'Import failed') });
    } catch {
      setResult({ success: false, message: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-3">
          <span className="material-symbols-outlined text-[#c084fc] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>storage</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#c084fc]">Data</span>
        </div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
          Data Management
        </h1>
        <p className="text-[#6d758c] mt-1">Import and manage city heat data</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 glass-card p-1.5 rounded-xl w-fit">
        {(['csv', 'geojson', 'weather'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] shadow-lg shadow-[#69f6b8]/20' : 'text-[#a3aac4] hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'csv' ? 'CSV Import' : tab === 'geojson' ? 'GeoJSON Import' : 'Weather Data'}
          </button>
        ))}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="font-bold text-white text-lg">
          {activeTab === 'csv' ? 'Import Neighborhood Data (CSV)' :
           activeTab === 'geojson' ? 'Import GeoJSON Boundaries' :
           'Import Weather Station Data'}
        </h3>

        <div className="text-xs text-[#a3aac4] space-y-1">
          {activeTab === 'csv' && (
            <p>Expected columns: name, population, areaSqkm, medianIncome, pctElderly, pctChildren</p>
          )}
          {activeTab === 'geojson' && (
            <p>Upload a GeoJSON FeatureCollection. Each feature should have a &ldquo;name&rdquo; property matching a neighborhood.</p>
          )}
          {activeTab === 'weather' && (
            <p>Expected columns: stationId, stationName, lat, lng, recordedAt, tempCelsius, humidity, windSpeedKmh</p>
          )}
        </div>

        <div className="border-2 border-dashed border-white/8 rounded-2xl p-10 text-center bg-[#060e20]/40 hover:border-[#69f6b8]/20 transition-colors">
          <span className="material-symbols-outlined text-4xl text-[#6d758c]/40 mb-3 block" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
          <input name="file" type="file" accept={activeTab === 'geojson' ? '.geojson,.json' : '.csv'} className="text-white text-sm" />
        </div>

        {result && (
          <div className={`px-4 py-2 rounded text-sm ${result.success ? 'bg-[#69f6b8]/10 text-[#69f6b8]' : 'bg-red-400/10 text-red-400'}`}>
            {result.message}
          </div>
        )}

        <button type="submit" disabled={uploading} className="px-6 py-3 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl shadow-lg shadow-[#69f6b8]/20 disabled:opacity-50 btn-shine">
          {uploading ? 'Importing...' : 'Import'}
        </button>
      </form>
    </div>
  );
}
