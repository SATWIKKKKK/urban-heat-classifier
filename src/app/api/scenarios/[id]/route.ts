import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const scenario = await prisma.scenario.findUnique({
      where: { id },
      include: {
        city: { select: { name: true, state: true, country: true } },
        reports: { select: { id: true, title: true, content: true }, orderBy: { generatedAt: 'desc' } },
        scenarioInterventions: {
          include: {
            intervention: {
              select: { id: true, name: true, type: true, status: true, estimatedCostUsd: true, estimatedTempReductionC: true, parameters: true },
            },
          },
        },
        simulationResults: { orderBy: { runAt: 'desc' }, take: 1, select: { outputSummary: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Find sibling scenario (created by same user within 2 minutes for A/B pair)
    const createdAt = scenario.createdAt;
    const twoMinBefore = new Date(createdAt.getTime() - 120_000);
    const twoMinAfter = new Date(createdAt.getTime() + 120_000);

    const sibling = await prisma.scenario.findFirst({
      where: {
        id: { not: id },
        cityId: scenario.cityId,
        createdById: scenario.createdById,
        createdAt: { gte: twoMinBefore, lte: twoMinAfter },
      },
      select: { id: true },
    });

    return NextResponse.json({
      ...scenario,
      siblingScenarioId: sibling?.id ?? null,
    });
  } catch (error) {
    console.error('Scenario fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
