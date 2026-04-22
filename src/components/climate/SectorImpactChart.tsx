'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';

interface SectorData {
  key: string;
  label: string;
  color: string;
  score: number | null;
  dataAvailable: boolean;
  description: string;
}

interface ApiResponse {
  sectors?: SectorData[];
  error?: string;
  country?: string;
}

function ChartSkeleton() {
  return (
    <div className="w-full h-[140px] rounded-lg bg-white/[0.02] animate-pulse flex flex-col gap-2 p-3">
      <div className="h-2 w-32 bg-white/[0.06] rounded" />
      <div className="flex-1 flex items-end gap-2 pb-2">
        {[65, 45, 80, 30, 55, 70].map((h, i) => (
          <div key={i} className="flex-1 bg-white/[0.05] rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function SectorImpactChart({ countryCode }: { countryCode: string | null }) {
  const [sectors, setSectors] = useState<SectorData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/climate/sector-impact?country=${encodeURIComponent(countryCode)}`)
      .then(r => r.json() as Promise<ApiResponse>)
      .then(json => {
        if (json.error) { setError(json.error); return; }
        if (json.sectors) setSectors(json.sectors);
      })
      .catch(() => setError('Failed to load sector data'))
      .finally(() => setLoading(false));
  }, [countryCode]);

  if (!countryCode) {
    return (
      <div className="w-full h-[90px] flex items-center justify-center">
        <p className="text-[10px] text-neutral-600">Search a city to see sector vulnerability</p>
      </div>
    );
  }

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <div className="w-full h-[90px] rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center gap-1">
        <span className="text-[10px] text-red-400">World Bank data unavailable</span>
        <button onClick={() => { setLoading(true); setError(null); }}
          className="text-[9px] text-neutral-400 underline">Retry</button>
      </div>
    );
  }

  const displayData = (sectors ?? [])
    .filter(s => s.dataAvailable && s.score !== null)
    .map(s => ({ ...s, shortLabel: s.label.split(' ')[0] }));

  if (displayData.length === 0) {
    return (
      <div className="w-full h-[90px] flex items-center justify-center">
        <p className="text-[10px] text-neutral-500">No sector data available for this country</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={displayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
          <XAxis
            dataKey="shortLabel"
            tick={{ fill: '#666', fontSize: 8 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#555', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}`}
          />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#aaa' }}
            formatter={(v: any, _name: any, props: any) => {
              const num = typeof v === 'number' ? v : 0;
              return [
                `${num}/100`,
                `${props?.payload?.label ?? ''} vulnerability`,
              ];
            }}
          />
          <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {displayData.map((s, i) => (
              <Cell key={i} fill={s.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[8px] text-neutral-600 mt-1">
        Source: World Bank Open Data · Higher score = more vulnerable
      </p>
    </div>
  );
}
