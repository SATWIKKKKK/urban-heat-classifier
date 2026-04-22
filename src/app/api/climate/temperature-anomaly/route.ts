import { NextResponse } from 'next/server';

// NASA GISS Surface Temperature Analysis (GISTEMP v4)
const NASA_GISTEMP_URLS = [
  'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv',
  'https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.txt',
];

export interface TempAnomalyPoint {
  year: number;
  anomaly: number;
}

// Verified NASA GISTEMP J-D annual mean anomalies (baseline 1951-1980)
// Source: https://data.giss.nasa.gov/gistemp/ — last verified April 2025
const FALLBACK_DATA: TempAnomalyPoint[] = [
  { year: 1990, anomaly: 0.45 }, { year: 1991, anomaly: 0.41 },
  { year: 1992, anomaly: 0.22 }, { year: 1993, anomaly: 0.24 },
  { year: 1994, anomaly: 0.31 }, { year: 1995, anomaly: 0.45 },
  { year: 1996, anomaly: 0.35 }, { year: 1997, anomaly: 0.46 },
  { year: 1998, anomaly: 0.63 }, { year: 1999, anomaly: 0.41 },
  { year: 2000, anomaly: 0.42 }, { year: 2001, anomaly: 0.54 },
  { year: 2002, anomaly: 0.63 }, { year: 2003, anomaly: 0.62 },
  { year: 2004, anomaly: 0.54 }, { year: 2005, anomaly: 0.68 },
  { year: 2006, anomaly: 0.64 }, { year: 2007, anomaly: 0.66 },
  { year: 2008, anomaly: 0.54 }, { year: 2009, anomaly: 0.64 },
  { year: 2010, anomaly: 0.72 }, { year: 2011, anomaly: 0.61 },
  { year: 2012, anomaly: 0.64 }, { year: 2013, anomaly: 0.68 },
  { year: 2014, anomaly: 0.75 }, { year: 2015, anomaly: 0.90 },
  { year: 2016, anomaly: 1.01 }, { year: 2017, anomaly: 0.92 },
  { year: 2018, anomaly: 0.85 }, { year: 2019, anomaly: 0.98 },
  { year: 2020, anomaly: 1.02 }, { year: 2021, anomaly: 0.85 },
  { year: 2022, anomaly: 0.89 }, { year: 2023, anomaly: 1.17 },
  { year: 2024, anomaly: 1.29 },
];

function parseCsv(csv: string): TempAnomalyPoint[] {
  const lines = csv.split('\n');
  const data: TempAnomalyPoint[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/[,\t]|\s{2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 14) continue;
    const year = parseInt(parts[0], 10);
    if (isNaN(year) || year < 1990) continue;
    const jd = parts[13];
    if (!jd || jd === '****' || jd === '***' || jd === '') continue;
    const anomaly = parseFloat(jd);
    if (isNaN(anomaly)) continue;
    data.push({ year, anomaly });
  }
  return data;
}

export async function GET() {
  try {
    let data: TempAnomalyPoint[] = [];

    for (const url of NASA_GISTEMP_URLS) {
      try {
        const res = await fetch(url, {
          next: { revalidate: 86400 },
          headers: { Accept: 'text/csv,text/plain,*/*' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          data = parseCsv(await res.text());
          if (data.length > 0) break;
        }
      } catch { /* try next URL */ }
    }

    const usedFallback = data.length === 0;
    if (usedFallback) data = FALLBACK_DATA;

    return NextResponse.json({
      data,
      source: usedFallback
        ? 'NASA GISTEMP v4 (cached reference data — live fetch unavailable)'
        : 'NASA GISS Surface Temperature Analysis (GISTEMP v4)',
      sourceUrl: 'https://data.giss.nasa.gov/gistemp/',
      baseline: '1951–1980 average',
      unit: '°C',
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    // Even on total failure, return fallback
    return NextResponse.json({
      data: FALLBACK_DATA,
      source: 'NASA GISTEMP v4 (cached reference data)',
      sourceUrl: 'https://data.giss.nasa.gov/gistemp/',
      baseline: '1951–1980 average',
      unit: '°C',
      lastFetched: new Date().toISOString(),
    });
  }
}
