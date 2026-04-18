import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { PdfBuilder } from '@/lib/pdf';
import { generateReportNarrative } from '@/lib/gemini';

function fmt$(n: number | null | undefined): string {
  return n != null ? `$${Math.round(n).toLocaleString()}` : 'N/A';
}
function fmtC(n: number | null | undefined): string {
  return n != null ? `-${n.toFixed(1)}\xb0C` : 'N/A';
}
function fmtN(n: number | null | undefined, unit = ''): string {
  return n != null ? `${n.toLocaleString()}${unit}` : 'N/A';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: {
      city: true,
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      scenarioInterventions: {
        include: {
          intervention: {
            include: { neighborhood: { select: { name: true, vulnerabilityLevel: true } } },
          },
        },
      },
      simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
    },
  });

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  if (session.user.role !== 'SUPER_ADMIN' && session.user.cityId !== scenario.cityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse simulation data ─────────────────────────────────────────────────

  type SimSummary = {
    averageTempReductionCelsius?: number;
    livesProtectedPerSummer?: number;
    projectedCo2ReductionTons?: number;
    energySavingsKwhPerYear?: number;
    costBenefitRatio?: number;
    costPerLifeProtected?: number;
  };
  type NeighResult = { neighborhood: string; reductionCelsius: number; livesSaved: number };

  const latestResult = scenario.simulationResults[0];
  let simSummary: SimSummary | null = null;
  let neighborhoodResults: NeighResult[] = [];

  try {
    if (latestResult?.outputSummary) simSummary = JSON.parse(latestResult.outputSummary) as SimSummary;
    if (latestResult?.neighborhoodResults) neighborhoodResults = JSON.parse(latestResult.neighborhoodResults) as NeighResult[];
  } catch { /* ignore parse errors */ }

  // Merge: prefer simulation result over stored scenario fields
  const cooling = simSummary?.averageTempReductionCelsius ?? scenario.totalProjectedTempReductionC;
  const lives = simSummary?.livesProtectedPerSummer ?? scenario.totalProjectedLivesSaved;
  const co2 = simSummary?.projectedCo2ReductionTons ?? scenario.projectedCo2ReductionTons;
  const energyKwh = simSummary?.energySavingsKwhPerYear ?? null;
  const cbr = simSummary?.costBenefitRatio ?? null;

  const interventions = scenario.scenarioInterventions.map(({ intervention: inv }) => ({
    name: inv.name,
    type: inv.type,
    neighborhood: inv.neighborhood?.name ?? 'City-wide',
    cost: inv.estimatedCostUsd,
    coolingC: inv.estimatedTempReductionC,
    status: inv.status,
  }));

  // ── Generate Gemini narrative ─────────────────────────────────────────────

  const narrative = await generateReportNarrative({
    scenarioName: scenario.name,
    cityName: scenario.city.name,
    cityState: scenario.city.state,
    description: scenario.description,
    budget: scenario.totalEstimatedCostUsd,
    livesProtected: lives,
    coolingCelsius: cooling,
    co2Tons: co2,
    energySavingsKwh: energyKwh,
    costBenefitRatio: cbr,
    priority: scenario.priority,
    tone: 'ACCESSIBLE',
    reportType: 'COUNCIL_BRIEF',
    interventions,
    neighborhoodResults: neighborhoodResults.length > 0 ? neighborhoodResults : undefined,
    councilNotes: scenario.councilNotes,
    createdBy: scenario.createdBy?.name,
    approvedBy: scenario.approvedBy?.name,
  });

  // ── Build PDF ─────────────────────────────────────────────────────────────

  const approvedDate = scenario.approvedAt
    ? scenario.approvedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const pdf = new PdfBuilder()
    .setFooter(scenario.city.name)

    // ── Cover block ──
    .addTitle(`Council Brief: ${scenario.name}`)
    .addMeta(
      `${scenario.city.name}${scenario.city.state ? ', ' + scenario.city.state : ''} · APPROVED · ${approvedDate}` +
      (scenario.approvedBy?.name ? ` · Approved by ${scenario.approvedBy.name}` : ''),
    )

    // ── Top-line metrics ──
    .addStatRow([
      { label: 'Total Budget', value: fmt$(scenario.totalEstimatedCostUsd) },
      { label: 'Lives Protected / Summer', value: fmtN(lives), accent: true },
      { label: 'Avg. Cooling', value: fmtC(cooling), accent: true },
      { label: 'CO\xb2 Reduction', value: co2 != null ? `${co2} t/yr` : 'N/A' },
    ])

    // ── Executive Summary ──
    .addH1('Executive Summary')
    .addParagraph(narrative.executiveSummary)

    // ── Additional metrics row ──
    .addStatRow([
      {
        label: 'Interventions',
        value: String(interventions.length),
      },
      {
        label: 'Neighborhoods',
        value: String(new Set(interventions.map((i) => i.neighborhood)).size),
      },
      { label: 'Energy Savings', value: energyKwh != null ? `${Math.round(energyKwh / 1000)}k kWh/yr` : 'N/A' },
      { label: 'Cost-Benefit Ratio', value: cbr != null ? cbr.toFixed(2) + 'x' : 'N/A', accent: cbr != null && cbr >= 1 },
    ])

    // ── Interventions Plan ──
    .addH1('Interventions Plan')
    .addTable(
      ['Intervention', 'Type', 'Neighborhood', 'Est. Cost', 'Est. Cooling'],
      interventions.map((inv) => [
        inv.name,
        inv.type.replace(/_/g, ' '),
        inv.neighborhood,
        fmt$(inv.cost),
        inv.coolingC != null ? `-${inv.coolingC.toFixed(1)}\xb0C` : 'N/A',
      ]),
      [3, 2, 2, 1.5, 1.5],
    );

  // ── Neighborhood Breakdown (if simulation data available) ──
  if (neighborhoodResults.length > 0) {
    pdf
      .addH1('Neighborhood-Level Impact')
      .addTable(
        ['Neighborhood', 'Temperature Reduction', 'Lives Protected'],
        neighborhoodResults.map((r) => [
          r.neighborhood,
          `-${r.reductionCelsius.toFixed(2)}\xb0C`,
          String(r.livesSaved),
        ]),
        [3, 2, 2],
      );
  }

  // ── Impact Analysis ──
  pdf
    .addH1('Impact Analysis')
    .addParagraph(narrative.impactAnalysis);

  // ── Council notes, if any ──
  if (scenario.councilNotes) {
    pdf
      .addH2('City Council Notes')
      .addCallout(scenario.councilNotes, 'info');
  }

  // ── Recommendations ──
  pdf
    .addH1('Recommendations')
    .addParagraph(narrative.recommendations);

  // ── Scenario metadata ──
  pdf
    .addDivider()
    .addH2('Scenario Metadata')
    .addTable(
      ['Field', 'Value'],
      [
        ['Status', scenario.status],
        ['Priority', scenario.priority ?? 'Not set'],
        ['Created By', scenario.createdBy?.name ?? 'Unknown'],
        ['Approved By', scenario.approvedBy?.name ?? 'N/A'],
        ['Approved On', approvedDate],
        ['Scenario ID', scenario.id],
      ],
      [1, 2],
    );

  const pdfBuffer = pdf.build();

  const filename = `${scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-council-brief.pdf`;
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
