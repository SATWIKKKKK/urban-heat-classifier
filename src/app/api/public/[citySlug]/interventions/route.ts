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

  const interventions = await prisma.intervention.findMany({
    where: { cityId: city.id, status: { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] } },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      location: true,
      estimatedTempReductionC: true,
      neighborhood: { select: { name: true } },
    },
  });

  return NextResponse.json(interventions);
}
