import { NextResponse } from 'next/server';
import { worldBankCode } from '@/lib/utils/countryCodeMapping';

// World Bank Open Data — no API key required
// https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
const WB_API = 'https://api.worldbank.org/v2';

// World Bank indicators mapped to climate-vulnerability sectors
// Higher raw value = lower vulnerability for inverted indicators
const SECTOR_CONFIG = [
  {
    key: 'water',
    label: 'Water Security',
    color: '#3b82f6',
    indicator: 'ER.H2O.FWST.ZS', // Water stress: freshwater withdrawal as % of available
    invert: false,
    max: 100,
    description: 'Freshwater withdrawal as % of available resources',
  },
  {
    key: 'food',
    label: 'Food Security',
    color: '#22c55e',
    indicator: 'SN.ITK.DEFC.ZS', // Prevalence of undernourishment (%)
    invert: false,
    max: 50,
    description: 'Prevalence of undernourishment (%)',
  },
  {
    key: 'health',
    label: 'Health',
    color: '#ef4444',
    indicator: 'SH.MED.BEDS.ZS', // Hospital beds per 1,000 (fewer = more vulnerable)
    invert: true,
    max: 15,
    description: 'Hospital beds per 1,000 people (inverted)',
  },
  {
    key: 'energy',
    label: 'Energy',
    color: '#f97316',
    indicator: 'EG.ELC.ACCS.ZS', // Electricity access % (lower = more vulnerable)
    invert: true,
    max: 100,
    description: 'Population with electricity access (inverted)',
  },
  {
    key: 'habitat',
    label: 'Human Habitat',
    color: '#a855f7',
    indicator: 'EN.URB.LCTY.UR.ZS', // Population in urban agglomerations > 1M as % of urban pop
    invert: false,
    max: 100,
    description: 'Urban concentration (proxy for heat island exposure)',
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    color: '#6b7280',
    indicator: 'IS.ROD.PAVE.ZS', // Paved roads as % of total roads
    invert: true,
    max: 100,
    description: 'Paved road coverage (inverted)',
  },
] as const;

interface WbResponse {
  value: number | null;
  date: string;
}

async function fetchIndicator(
  wbCode: string,
  indicatorCode: string,
): Promise<number | null> {
  try {
    const url = `${WB_API}/country/${wbCode}/indicator/${indicatorCode}?format=json&mrv=5&per_page=5`;
    const res = await fetch(url, { next: { revalidate: 604800 } }); // 7-day cache
    if (!res.ok) return null;
    const json = await res.json() as [unknown, WbResponse[]];
    if (!Array.isArray(json) || json.length < 2) return null;
    const rows = json[1];
    // Find most recent non-null value
    const valid = rows?.find(r => r.value !== null);
    return valid?.value ?? null;
  } catch {
    return null;
  }
}

function toVulnerabilityScore(
  value: number | null,
  max: number,
  invert: boolean,
): number | null {
  if (value === null) return null;
  const clamped = Math.min(Math.max(value, 0), max);
  const normalized = (clamped / max) * 100;
  return Math.round(invert ? 100 - normalized : normalized);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.toLowerCase() ?? 'in';
  const wbCode = worldBankCode(country);

  try {
    const results = await Promise.all(
      SECTOR_CONFIG.map(async (cfg) => {
        const raw = await fetchIndicator(wbCode, cfg.indicator);
        const score = toVulnerabilityScore(raw, cfg.max, cfg.invert);
        return {
          key: cfg.key,
          label: cfg.label,
          color: cfg.color,
          score,
          rawValue: raw,
          description: cfg.description,
          indicator: cfg.indicator,
          dataAvailable: raw !== null,
        };
      }),
    );

    return NextResponse.json({
      country,
      wbCode,
      sectors: results,
      source: 'World Bank Open Data',
      sourceUrl: 'https://data.worldbank.org/',
      note: 'Vulnerability scores derived from World Bank development indicators. Higher = more vulnerable.',
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch sector impact data', source: 'World Bank Open Data', details: String(err) },
      { status: 502 },
    );
  }
}
