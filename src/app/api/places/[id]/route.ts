import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
  }

  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      city: true,
      heatMeasurements: {
        orderBy: { measurementDate: 'desc' },
        take: 1,
      },
    },
  });

  if (!place) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  const latestMeasurement = place.heatMeasurements[0];

  return NextResponse.json({
    id: place.id,
    name: place.name,
    city: {
      name: place.city.name,
      state: place.city.state,
      country: place.city.country,
      countryCode: place.city.country.toLowerCase().substring(0, 2),
      lat: place.city.lat,
      lng: place.city.lng,
    },
    lat: null, 
    lng: null,
    population: place.population,
    avgSurfaceTempC: latestMeasurement?.avgTempCelsius,
    treeCanopyPct: latestMeasurement?.treeCanopyPct,
    imperviousSurfacePct: latestMeasurement?.imperviousSurfacePct,
    vulnerabilityScore: place.vulnerabilityScore,
    vulnerabilityLevel: place.vulnerabilityLevel,
  });
}
