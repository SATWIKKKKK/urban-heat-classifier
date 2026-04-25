import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Place ID is required' }, { status: 400 });
  }

  const place = await prisma.place.findUnique({
    where: { id },
    select: { name: true },
  });

  if (!place) {
    return NextResponse.json({ error: 'Place not found' }, { status: 404 });
  }

  return NextResponse.json({ name: place.name }, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}
