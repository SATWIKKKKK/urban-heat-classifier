import { NextResponse } from 'next/server';
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
    const body = await request.json();
    const {
      cityId,
      name,
      description,
      createdById,
      interventionIds,
      priority,
      totalEstimatedCostUsd,
      totalProjectedTempReductionC,
      totalProjectedLivesSaved,
      projectedCo2ReductionTons,
      simulationSummary,
      neighborhoodResults,
    } = body;
    if (!cityId || !name || !createdById) {
      return NextResponse.json({ error: 'cityId, name and createdById required' }, { status: 400 });
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
        createdById,
      },
    });

    if (Array.isArray(interventionIds) && interventionIds.length > 0) {
      const links = interventionIds.map((iid: string) => ({ scenarioId: scenario.id, interventionId: iid }));
      await prisma.scenarioIntervention.createMany({ data: links });
    }

    if (simulationSummary || neighborhoodResults) {
      await prisma.simulationResult.create({
        data: {
          scenarioId: scenario.id,
          outputSummary: simulationSummary ? JSON.stringify(simulationSummary) : null,
          neighborhoodResults: neighborhoodResults ? JSON.stringify(neighborhoodResults) : null,
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
