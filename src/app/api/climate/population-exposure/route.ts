import { NextResponse } from 'next/server';
import { worldBankCode } from '@/lib/utils/countryCodeMapping';

// World Bank Open Data — no API key required
const WB_API = 'https://api.worldbank.org/v2';

interface WbDataRow {
  date: string;
  value: number | null;
}

async function fetchWbIndicator(
  wbCode: string,
  indicator: string,
  dateRange: string,
): Promise<Record<string, number>> {
  const url = `${WB_API}/country/${wbCode}/indicator/${indicator}?format=json&date=${dateRange}&per_page=20`;
  const res = await fetch(url, { next: { revalidate: 604800 } });
  if (!res.ok) throw new Error(`World Bank API error: ${res.status}`);
  const json = await res.json() as [unknown, WbDataRow[]];
  if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
    throw new Error('Invalid World Bank API response');
  }
  const result: Record<string, number> = {};
  for (const row of json[1]) {
    if (row.value !== null && row.date) {
      result[row.date] = row.value;
    }
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.toLowerCase() ?? 'in';
  const wbCode = worldBankCode(country);
  const years = [2018, 2019, 2020, 2021, 2022, 2023];
  const dateRange = '2018:2023';

  try {
    // SP.POP.TOTL — total population
    const popData = await fetchWbIndicator(wbCode, 'SP.POP.TOTL', dateRange);

    // EN.CLC.DRSK.XQ — Droughts, floods, extreme temps (climate risk score 0-5)
    // Higher = higher climate risk exposure
    let exposureData: Record<string, number> = {};
    try {
      exposureData = await fetchWbIndicator(wbCode, 'EN.CLC.DRSK.XQ', dateRange);
    } catch {
      // Fallback: use urbanization as a proxy for heat exposure
      try {
        exposureData = await fetchWbIndicator(wbCode, 'SP.URB.TOTL.IN.ZS', dateRange);
      } catch {
        // no data
      }
    }

    const data = years.map((year) => {
      const pop = popData[String(year)] ?? null;
      const exposure = exposureData[String(year)] ?? null;

      // Calculate exposed population
      // If we have climate risk score (0-5), scale to 0-100%
      // If we have urbanization, use as exposure proxy
      let exposedMillions: number | null = null;
      if (pop !== null) {
        if (exposure !== null) {
          // Normalize exposure to 0-1 fraction
          const exposureFraction = Math.min(exposure / 5, 1); // climate risk 0-5 scale
          exposedMillions = Math.round((pop * exposureFraction) / 1_000_000 * 10) / 10;
        }
      }

      return {
        year,
        population: pop !== null ? Math.round(pop / 1_000_000 * 10) / 10 : null,
        exposedMillions,
        exposureIndex: exposure,
      };
    });

    return NextResponse.json({
      country,
      wbCode,
      data,
      source: 'World Bank Open Data',
      indicators: {
        population: 'SP.POP.TOTL',
        climateRisk: 'EN.CLC.DRSK.XQ (Droughts, Floods, Extreme Temp Index)',
      },
      sourceUrl: 'https://data.worldbank.org/',
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch population exposure data', source: 'World Bank Open Data', details: String(err) },
      { status: 502 },
    );
  }
}
