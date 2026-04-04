import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ citySlug: string }> }
) {
  const { citySlug } = await params;

  const city = await prisma.city.findUnique({ where: { slug: citySlug } });
  if (!city) {
    return NextResponse.json({ error: 'City not found' }, { status: 404 });
  }

  const neighborhoods = await prisma.neighborhood.findMany({
    where: { cityId: city.id },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
    },
  });

  const features = neighborhoods
    .filter((n) => n.boundary)
    .map((n) => {
      const latest = n.heatMeasurements[0];
      return {
        type: 'Feature' as const,
        properties: {
          id: n.id,
          name: n.name,
          population: n.population,
          avgTemp: latest?.avgTempCelsius ?? null,
          maxTemp: latest?.maxTempCelsius ?? null,
        },
        geometry: JSON.parse(n.boundary!),
      };
    });

  return NextResponse.json({
    type: 'FeatureCollection',
    features,
  });
}
