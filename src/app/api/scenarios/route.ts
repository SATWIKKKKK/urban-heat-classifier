import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId');
    if (!cityId) return NextResponse.json({ error: 'cityId required' }, { status: 400 });

    const scenarios = await prisma.scenario.findMany({
      where: { cityId },
      include: {
        scenarioInterventions: { include: { intervention: true } },
        simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ scenarios });
  } catch (err) {
    console.error('scenarios list error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve the real DB user (JWT can have stale IDs after a DB reseed)
    let resolvedUserId = session.user.id;
    const dbUser = await prisma.user.findUnique({ where: { id: resolvedUserId }, select: { id: true } });
    if (!dbUser) {
      const email = session.user.email?.toLowerCase().trim();
      const userByEmail = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }) : null;
      if (!userByEmail) return NextResponse.json({ error: 'User account not found. Please sign in again.' }, { status: 401 });
      resolvedUserId = userByEmail.id;
    }

    const body = await request.json();
    const {
      cityId,
      name,
      description,
      interventionIds,
      priority,
      totalEstimatedCostUsd,
      totalProjectedTempReductionC,
      totalProjectedLivesSaved,
      projectedCo2ReductionTons,
      simulationSummary,
      placeResults,
    } = body;
    if (!cityId || !name) {
      return NextResponse.json({ error: 'cityId and name are required' }, { status: 400 });
    }

    const scenario = await prisma.scenario.create({
      data: {
        cityId,
        name,
        description: description || null,
        status: 'DRAFT',
        priority: priority || null,
        totalEstimatedCostUsd: totalEstimatedCostUsd ?? null,
        totalProjectedTempReductionC: totalProjectedTempReductionC ?? null,
        totalProjectedLivesSaved: totalProjectedLivesSaved ?? null,
        projectedCo2ReductionTons: projectedCo2ReductionTons ?? null,
        createdById: resolvedUserId,
      },
    });

    if (Array.isArray(interventionIds) && interventionIds.length > 0) {
      const links = interventionIds.map((iid: string) => ({ scenarioId: scenario.id, interventionId: iid }));
      await prisma.scenarioIntervention.createMany({ data: links });
    }

    if (simulationSummary || placeResults) {
      await prisma.simulationResult.create({
        data: {
          scenarioId: scenario.id,
          outputSummary: simulationSummary ? JSON.stringify(simulationSummary) : null,
          placeResults: placeResults ? JSON.stringify(placeResults) : null,
          modelVersion: 'workflow-v1',
        },
      });
    }

    return NextResponse.json({ scenario });
  } catch (err) {
    console.error('create scenario error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
