'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function DataManagementPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'csv' | 'geojson' | 'weather'>('csv');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmResult, setOsmResult] = useState<{ success: boolean; message: string } | null>(null);

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

  async function handleOSMImport() {
    if (!session?.user?.cityId) {
      setOsmResult({ success: false, message: 'No city assigned to your account' });
      return;
    }
    setOsmLoading(true);
    setOsmResult(null);
    try {
      const res = await fetch('/api/data/import/osm-boundaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityId: session.user.cityId }),
      });
      const data = await res.json();
      setOsmResult({ success: res.ok, message: data.message || (res.ok ? 'Import successful' : 'Import failed') });
    } catch {
      setOsmResult({ success: false, message: 'OSM import failed' });
    } finally {
      setOsmLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-[0.06em] mb-1">Data</p>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Data Management</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Import and manage city heat data</p>
      </div>

      {/* Quick Import from OSM */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Quick Import from OpenStreetMap</h3>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Automatically fetch neighborhood boundaries for your city from OSM.
            </p>
          </div>
          <button
            onClick={handleOSMImport}
            disabled={osmLoading}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--green-400)] text-[#0a0a0a] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {osmLoading ? 'Importing…' : 'Import Boundaries'}
          </button>
        </div>
        {osmResult && (
          <div className={`mt-3 px-3 py-1.5 rounded text-xs ${osmResult.success ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' : 'bg-[var(--critical)]/10 text-[var(--critical)]'}`}>
            {osmResult.message}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border)] p-1 rounded-lg w-fit">
        {(['csv', 'geojson', 'weather'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab === 'csv' ? 'CSV Import' : tab === 'geojson' ? 'GeoJSON Import' : 'Weather Data'}
          </button>
        ))}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          {activeTab === 'csv' ? 'Import Neighborhood Data (CSV)' :
           activeTab === 'geojson' ? 'Import GeoJSON Boundaries' :
           'Import Weather Station Data'}
        </h3>

        <div className="text-xs text-[var(--text-tertiary)] space-y-1">
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

        <div className="border border-dashed border-[var(--border-strong)] rounded-lg p-8 text-center bg-[var(--bg-base)] hover:border-[var(--green-400)]/30 transition-colors">
          <span className="material-symbols-outlined text-3xl text-[var(--text-tertiary)]/40 mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
          <input name="file" type="file" accept={activeTab === 'geojson' ? '.geojson,.json' : '.csv'} className="text-[var(--text-secondary)] text-xs" />
        </div>

        {result && (
          <div className={`px-3 py-1.5 rounded text-xs ${result.success ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' : 'bg-[var(--critical)]/10 text-[var(--critical)]'}`}>
            {result.message}
          </div>
        )}

        <button type="submit" disabled={uploading} className="px-4 py-2 text-xs font-medium rounded-md bg-[var(--green-400)] text-[#0a0a0a] hover:opacity-90 transition-opacity disabled:opacity-50">
          {uploading ? 'Importing…' : 'Import'}
        </button>
      </form>
    </div>
  );
}
