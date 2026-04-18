import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId');
    const includeProposed = url.searchParams.get('includeProposed') === 'true';

    if (!cityId) return NextResponse.json({ error: 'cityId required' }, { status: 400 });

    const where: Prisma.InterventionWhereInput = { cityId };
    if (!includeProposed) {
      where.status = { in: ['APPROVED', 'IN_PROGRESS', 'COMPLETED'] };
    }

    const interventions = await prisma.intervention.findMany({
      where,
      include: {
        neighborhood: { select: { name: true } },
        proposedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ interventions });
  } catch (err) {
    console.error('interventions api error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
