import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'RESIDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const reports = await prisma.citizenReport.findMany({
      where: { reportedById: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        description: true,
        heatSeverity: true,
        status: true,
        createdAt: true,
        latitude: true,
        longitude: true,
      },
    });

    return NextResponse.json({ reports });
  } catch (err) {
    console.error('GET /api/resident/reports error:', err);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'RESIDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { heatSeverity, description, latitude, longitude } = body;

    if (!heatSeverity || !description) {
      return NextResponse.json({ error: 'heatSeverity and description are required' }, { status: 400 });
    }

    // Find a city to associate the report with.
    // Use the first city that geographically contains this location,
    // or fall back to any city in the system.
    let cityId: string | null = null;

    if (latitude && longitude) {
      // Try to find city by proximity (simple approach: first city in DB)
      const city = await prisma.city.findFirst({ select: { id: true } });
      cityId = city?.id ?? null;
    }

    if (!cityId) {
      const city = await prisma.city.findFirst({ select: { id: true } });
      cityId = city?.id ?? null;
    }

    if (!cityId) {
      return NextResponse.json({ error: 'No city found to associate report' }, { status: 400 });
    }

    const report = await prisma.citizenReport.create({
      data: {
        cityId,
        reportedById: session.user.id,
        heatSeverity,
        description,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        status: 'SUBMITTED',
      },
    });

    return NextResponse.json({ report });
  } catch (err) {
    console.error('POST /api/resident/reports error:', err);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
