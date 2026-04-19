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

  const features = payload.places.map((place) => ({
    type: 'Feature' as const,
    properties: {
      id: place.id,
      name: place.name,
      population: place.population,
      avgTemp: place.avgTemp,
      maxTemp: place.maxTemp,
      vulnerabilityScore: place.vulnerabilityScore,
      vulnerabilityLevel: place.vulnerabilityLevel,
    },
    geometry: place.geometry,
  }));

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  });
}
