'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';

interface TempAnomalyPoint {
  year: number;
  anomaly: number;
}

interface ApiResponse {
  data?: TempAnomalyPoint[];
  error?: string;
  source?: string;
}

function ChartSkeleton() {
  return (
    <div className="w-full h-[130px] rounded-lg bg-white/[0.02] animate-pulse flex flex-col gap-2 p-3">
      <div className="h-2 w-40 bg-white/[0.06] rounded" />
      <div className="flex-1 bg-white/[0.03] rounded" />
      <div className="h-1.5 w-24 bg-white/[0.04] rounded" />
    </div>
  );
}

export default function TempAnomalyChart({ countryCode }: { countryCode: string | null }) {
  const [data, setData] = useState<TempAnomalyPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    setError(null);
    // NASA GISTEMP is global data — same regardless of country
    fetch('/api/climate/temperature-anomaly')
      .then(r => r.json() as Promise<ApiResponse>)
      .then(json => {
        if (json.error) { setError(json.error); return; }
        if (json.data) { setData(json.data); setSource(json.source ?? ''); }
      })
      .catch(() => setError('Failed to load temperature data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <div className="w-full h-[100px] rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center gap-1 p-3">
        <span className="text-[10px] text-red-400">NASA GISTEMP unavailable</span>
        <span className="text-[9px] text-neutral-600">{error}</span>
        <button onClick={() => { setLoading(true); setError(null); }}
          className="mt-1 text-[9px] text-neutral-400 underline">Retry</button>
      </div>
    );
  }

  const countryLabel = countryCode ? '' : 'Global';
  const title = `${countryLabel} Temperature Anomaly (°C)`.trim();

  return (
    <div className="w-full">
      <p className="text-[10px] text-neutral-500 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={110}>
        <AreaChart data={data ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#555', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval={9}
          />
          <YAxis
            tick={{ fill: '#555', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v > 0 ? '+' : ''}${(v as number).toFixed(1)}`}
          />
          <ReferenceLine y={0} stroke="#444" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#aaa' }}
            formatter={(v: any) => {
              const num = typeof v === 'number' ? v : 0;
              return [`${num > 0 ? '+' : ''}${num.toFixed(2)}°C`, 'Anomaly'];
            }}
            labelFormatter={l => `Year ${l}`}
          />
          <Area
            type="monotone"
            dataKey="anomaly"
            stroke="#22c55e"
            strokeWidth={1.5}
            fill="url(#tempGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-[8px] text-neutral-600 mt-1">
        Source: NASA GISS Surface Temperature Analysis (GISTEMP v4) · 1951–1980 baseline
      </p>
    </div>
  );
}
