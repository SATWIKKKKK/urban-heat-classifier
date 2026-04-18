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

  return NextResponse.json(
    payload.interventions.map((intervention) => ({
      id: intervention.id,
      name: intervention.name,
      type: intervention.type,
      status: intervention.status,
      location: intervention.point,
      estimatedTempReductionC: intervention.estimatedTempReductionC,
      neighborhood: intervention.neighborhoodName ? { name: intervention.neighborhoodName } : null,
    }))
  );
}
