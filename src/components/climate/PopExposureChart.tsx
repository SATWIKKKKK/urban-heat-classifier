'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ExposurePoint {
  year: number;
  population: number | null;
  exposedMillions: number | null;
  exposureIndex: number | null;
}

interface ApiResponse {
  data?: ExposurePoint[];
  error?: string;
}

function ChartSkeleton() {
  return (
    <div className="w-full h-[120px] rounded-lg bg-white/[0.02] animate-pulse flex flex-col gap-2 p-3">
      <div className="h-2 w-36 bg-white/[0.06] rounded" />
      <div className="flex-1 bg-white/[0.03] rounded" />
      <div className="h-1.5 w-28 bg-white/[0.04] rounded" />
    </div>
  );
}

export default function PopExposureChart({ countryCode }: { countryCode: string | null }) {
  const [data, setData] = useState<ExposurePoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!countryCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/climate/population-exposure?country=${encodeURIComponent(countryCode)}`)
      .then(r => r.json() as Promise<ApiResponse>)
      .then(json => {
        if (json.error) { setError(json.error); return; }
        if (json.data) setData(json.data);
      })
      .catch(() => setError('Failed to load exposure data'))
      .finally(() => setLoading(false));
  }, [countryCode]);

  if (!countryCode) {
    return (
      <div className="w-full h-[80px] flex items-center justify-center">
        <p className="text-[10px] text-neutral-600">Search a city to see population exposure</p>
      </div>
    );
  }

  if (loading) return <ChartSkeleton />;

  if (error) {
    return (
      <div className="w-full h-[80px] rounded-lg border border-red-500/20 bg-red-500/5 flex flex-col items-center justify-center gap-1">
        <span className="text-[10px] text-red-400">Population data unavailable</span>
        <button onClick={() => { setLoading(true); setError(null); }}
          className="text-[9px] text-neutral-400 underline">Retry</button>
      </div>
    );
  }

  // Show either exposed or total population trend
  const hasExposure = data?.some(d => d.exposedMillions !== null);
  const hasPopulation = data?.some(d => d.population !== null);

  if (!hasExposure && !hasPopulation) {
    return (
      <div className="w-full h-[80px] flex items-center justify-center">
        <p className="text-[10px] text-neutral-500">No population data available for this country</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data ?? []} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#555', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#555', fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(v as number).toFixed(0)}M`}
          />
          <Tooltip
            contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#aaa' }}
            formatter={(v: any, name: any) => {
              const num = typeof v === 'number' ? v : 0;
              return [
                `${num.toFixed(1)}M people`,
                name === 'exposedMillions' ? 'Exposed to heat risk' : 'Total population',
              ];
            }}
            labelFormatter={l => `Year ${l}`}
          />
          {hasExposure && (
            <Line
              type="monotone"
              dataKey="exposedMillions"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f97316' }}
              connectNulls
            />
          )}
          {hasPopulation && !hasExposure && (
            <Line
              type="monotone"
              dataKey="population"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22c55e' }}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[8px] text-neutral-600 mt-1">
        Source: World Bank Open Data (SP.POP.TOTL + EN.CLC.DRSK.XQ)
      </p>
    </div>
  );
}
