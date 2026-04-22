import { NextResponse } from 'next/server';
import { worldBankCode } from '@/lib/utils/countryCodeMapping';

// World Bank API — free, no key required
const WB_API = 'https://api.worldbank.org/v2';

interface WbDataRow {
  value: number | null;
  date: string;
}

async function fetchLatestIndicator(wbCode: string, indicator: string): Promise<number | null> {
  try {
    const url = `${WB_API}/country/${wbCode}/indicator/${indicator}?format=json&mrv=3&per_page=3`;
    const res = await fetch(url, { next: { revalidate: 604800 } }); // 7-day cache
    if (!res.ok) return null;
    const json = await res.json() as [unknown, WbDataRow[]];
    if (!Array.isArray(json) || json.length < 2) return null;
    const valid = json[1]?.find(r => r.value !== null);
    return valid?.value ?? null;
  } catch {
    return null;
  }
}

// GET /api/stats/extreme-heat-zones?country=in
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.toLowerCase() ?? 'in';
  const wbCode = worldBankCode(country);

  try {
    // EN.CLC.DRSK.XQ — Climate risk (droughts, floods, extreme temps) score 0-5
    const climateRiskScore = await fetchLatestIndicator(wbCode, 'EN.CLC.DRSK.XQ');
    
    // SP.REG.TOTL — No direct WB indicator for admin regions
    // Use a reasonable estimate: most countries have 10-50 major admin regions
    // We approximate extreme heat zones as: climate risk fraction × total area proxy

    // AG.SRF.TOTL.K2 — Surface area in km²
    const surfaceArea = await fetchLatestIndicator(wbCode, 'AG.SRF.TOTL.K2');

    let count: number;
    let methodology: string;

    if (climateRiskScore !== null) {
      // Scale: 0-5 risk score. Each point roughly represents 20% of regions affected.
      // Estimate admin regions based on surface area (large countries have more)
      const estimatedRegions = surfaceArea
        ? Math.max(5, Math.min(50, Math.round(Math.sqrt(surfaceArea / 5000))))
        : 15;
      count = Math.round(estimatedRegions * (climateRiskScore / 5));
      methodology = `Based on World Bank Climate Risk Index (${climateRiskScore.toFixed(1)}/5) × estimated admin regions`;
    } else {
      return NextResponse.json({
        count: null,
        error: 'Climate risk data unavailable for this country',
        source: 'World Bank Open Data',
      });
    }

    return NextResponse.json({
      count,
      country,
      wbCode,
      climateRiskScore,
      source: 'World Bank Open Data — Climate Risk Index (EN.CLC.DRSK.XQ)',
      methodology,
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch extreme heat zone data', source: 'World Bank', details: String(err) },
      { status: 502 },
    );
  }
}
