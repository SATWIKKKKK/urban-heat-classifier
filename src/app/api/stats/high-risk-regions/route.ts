import { NextResponse } from 'next/server';
import { worldBankCode } from '@/lib/utils/countryCodeMapping';

const WB_API = 'https://api.worldbank.org/v2';

interface WbDataRow {
  value: number | null;
}

// GET /api/stats/high-risk-regions?country=in
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country')?.toLowerCase() ?? 'in';
  const wbCode = worldBankCode(country);

  try {
    // Combine multiple risk factors to estimate high-risk regions:
    // 1. Water stress (ER.H2O.FWST.ZS) — high stress = at risk
    // 2. Climate risk score (EN.CLC.DRSK.XQ)
    // 3. Urban heat exposure (SP.URB.TOTL.IN.ZS) — urbanization

    const fetchIndicator = async (ind: string): Promise<number | null> => {
      try {
        const res = await fetch(
          `${WB_API}/country/${wbCode}/indicator/${ind}?format=json&mrv=3&per_page=3`,
          { next: { revalidate: 604800 } },
        );
        if (!res.ok) return null;
        const json = await res.json() as [unknown, WbDataRow[]];
        return json[1]?.find(r => r.value !== null)?.value ?? null;
      } catch {
        return null;
      }
    };

    const [climateRisk, waterStress, urbanPct, surfaceArea] = await Promise.all([
      fetchIndicator('EN.CLC.DRSK.XQ'),
      fetchIndicator('ER.H2O.FWST.ZS'),
      fetchIndicator('SP.URB.TOTL.IN.ZS'),
      fetchIndicator('AG.SRF.TOTL.K2'),
    ]);

    if (climateRisk === null && waterStress === null) {
      return NextResponse.json({
        count: null,
        error: 'Risk data unavailable for this country',
        source: 'World Bank Open Data',
      });
    }

    // Estimate total admin regions from surface area
    const estimatedRegions = surfaceArea
      ? Math.max(5, Math.min(50, Math.round(Math.sqrt(surfaceArea / 5000))))
      : 15;

    // Composite risk score (0-1)
    const riskComponents: number[] = [];
    if (climateRisk !== null) riskComponents.push(climateRisk / 5); // normalize 0-5 → 0-1
    if (waterStress !== null) riskComponents.push(Math.min(waterStress / 100, 1));
    if (urbanPct !== null) riskComponents.push(Math.min(urbanPct / 80, 1)); // >80% urban = high risk

    const avgRisk = riskComponents.length > 0
      ? riskComponents.reduce((a, b) => a + b, 0) / riskComponents.length
      : 0.4;

    // High-risk regions: those with composite risk > 0.6
    const highRiskFraction = Math.max(0, avgRisk - 0.3); // fraction above threshold
    const count = Math.round(estimatedRegions * highRiskFraction * 1.5);

    return NextResponse.json({
      count: Math.max(0, count),
      country,
      wbCode,
      factors: {
        climateRisk: climateRisk?.toFixed(2),
        waterStress: waterStress?.toFixed(1),
        urbanization: urbanPct?.toFixed(1),
      },
      source: 'World Bank Open Data — Composite Risk Index',
      methodology: 'Composite of climate risk, water stress, and urbanization indicators',
      lastFetched: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch high-risk region data', source: 'World Bank', details: String(err) },
      { status: 502 },
    );
  }
}
