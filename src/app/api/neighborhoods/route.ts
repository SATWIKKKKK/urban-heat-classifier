import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get('cityId');
  if (!cityId) {
    return NextResponse.json([], { status: 200 });
  }

  const neighborhoods = await prisma.neighborhood.findMany({
    where: { cityId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(neighborhoods);
}
