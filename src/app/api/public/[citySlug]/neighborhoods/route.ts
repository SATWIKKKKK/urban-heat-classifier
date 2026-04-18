import { NextRequest, NextResponse } from 'next/server';
import { getCityMapData } from '@/lib/map-data';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ citySlug: string }> }
) {
  const { citySlug } = await params;

  const payload = await getCityMapData({ citySlug, publicOnly: true });
  if (!payload) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 });
  }

  const features = payload.neighborhoods.map((neighborhood) => ({
    type: 'Feature' as const,
    properties: {
      id: neighborhood.id,
      name: neighborhood.name,
      population: neighborhood.population,
      avgTemp: neighborhood.avgTemp,
      maxTemp: neighborhood.maxTemp,
      vulnerabilityScore: neighborhood.vulnerabilityScore,
      vulnerabilityLevel: neighborhood.vulnerabilityLevel,
    },
    geometry: neighborhood.geometry,
  }));

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  });
}
