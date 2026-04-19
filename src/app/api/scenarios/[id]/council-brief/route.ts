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
            include: { place: { select: { name: true, vulnerabilityLevel: true } } },
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
  type NeighResult = { place: string; reductionCelsius: number; livesSaved: number };

  const latestResult = scenario.simulationResults[0];
  let simSummary: SimSummary | null = null;
  let placeResults: NeighResult[] = [];

  try {
    if (latestResult?.outputSummary) simSummary = JSON.parse(latestResult.outputSummary) as SimSummary;
    if (latestResult?.placeResults) placeResults = JSON.parse(latestResult.placeResults) as NeighResult[];
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
    place: inv.place?.name ?? 'City-wide',
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
    placeResults: placeResults.length > 0 ? placeResults : undefined,
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
        label: 'Places',
        value: String(new Set(interventions.map((i) => i.place)).size),
      },
      { label: 'Energy Savings', value: energyKwh != null ? `${Math.round(energyKwh / 1000)}k kWh/yr` : 'N/A' },
      { label: 'Cost-Benefit Ratio', value: cbr != null ? cbr.toFixed(2) + 'x' : 'N/A', accent: cbr != null && cbr >= 1 },
    ])

    // ── Interventions Plan ──
    .addH1('Interventions Plan')
    .addTable(
      ['Intervention', 'Type', 'Place', 'Est. Cost', 'Est. Cooling'],
      interventions.map((inv) => [
        inv.name,
        inv.type.replace(/_/g, ' '),
        inv.place,
        fmt$(inv.cost),
        inv.coolingC != null ? `-${inv.coolingC.toFixed(1)}\xb0C` : 'N/A',
      ]),
      [3, 2, 2, 1.5, 1.5],
    );

  // ── Place Breakdown (if simulation data available) ──
  if (placeResults.length > 0) {
    pdf
      .addH1('Place-Level Impact')
      .addTable(
        ['Place', 'Temperature Reduction', 'Lives Protected'],
        placeResults.map((r) => [
          r.place,
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
        ['Total Interventions', String(interventions.length)],
        ['Places Covered', String(new Set(interventions.map((i) => i.place)).size)],
        ['Scenario ID', scenario.id],
      ],
      [1, 2],
    );

  // ── Risk Matrix ──
  const criticalInterventions = interventions.filter((i) => i.coolingC != null && i.coolingC >= 2.0);
  const highCostInterventions = interventions.filter((i) => i.cost != null && i.cost >= 500000);
  const pendingInterventions = interventions.filter((i) => i.status === 'PROPOSED');

  pdf.addH1('Risk Assessment Matrix');
  if (criticalInterventions.length > 0) {
    pdf.addCallout(
      `HIGH IMPACT — ${criticalInterventions.length} intervention${criticalInterventions.length !== 1 ? 's' : ''} project a temperature reduction ≥ 2.0°C: ` +
      criticalInterventions.map((i) => `${i.name} (${fmtC(i.coolingC)})`).join(', ') + '. Prioritise these for earliest deployment.',
      'success',
    );
  }
  if (pendingInterventions.length > 0) {
    pdf.addCallout(
      `PENDING APPROVAL — ${pendingInterventions.length} intervention${pendingInterventions.length !== 1 ? 's' : ''} still in PROPOSED status: ` +
      pendingInterventions.map((i) => i.name).join(', ') + '. Council approval required before site preparation begins.',
      'warn',
    );
  }
  if (highCostInterventions.length > 0) {
    pdf.addCallout(
      `BUDGET FLAG — ${highCostInterventions.length} intervention${highCostInterventions.length !== 1 ? 's' : ''} with individual cost ≥ ₹5,00,000: ` +
      highCostInterventions.map((i) => `${i.name} (${fmt$(i.cost)})`).join(', ') + '. Verify procurement capacity and phased disbursement timelines.',
      'info',
    );
  }

  // ── Budget Breakdown by Type ──
  const typeGroups: Record<string, { count: number; totalCost: number; totalCooling: number }> = {};
  interventions.forEach((inv) => {
    const key = inv.type.replace(/_/g, ' ');
    if (!typeGroups[key]) typeGroups[key] = { count: 0, totalCost: 0, totalCooling: 0 };
    typeGroups[key].count++;
    if (inv.cost != null) typeGroups[key].totalCost += inv.cost;
    if (inv.coolingC != null) typeGroups[key].totalCooling += inv.coolingC;
  });

  if (Object.keys(typeGroups).length > 1) {
    pdf
      .addH1('Budget Breakdown by Intervention Type')
      .addTable(
        ['Type', 'Count', 'Total Cost', 'Avg. Cooling'],
        Object.entries(typeGroups).map(([type, g]) => [
          type,
          String(g.count),
          g.totalCost > 0 ? fmt$(g.totalCost) : 'N/A',
          g.count > 0 ? `-${(g.totalCooling / g.count).toFixed(1)}°C avg` : 'N/A',
        ]),
        [2.5, 1, 1.5, 1.5],
      );
  }

  // ── Implementation Phases ──
  pdf.addH1('Implementation Phases');
  const phase1 = interventions.filter((i) => i.coolingC != null && i.coolingC >= 1.5);
  const phase2 = interventions.filter((i) => !phase1.includes(i) && i.status !== 'PROPOSED');
  const phase3 = interventions.filter((i) => i.status === 'PROPOSED');

  pdf.addTable(
    ['Phase', 'Scope', 'Interventions', 'Est. Cost'],
    [
      [
        'Phase 1 (0–6 mo)',
        'Highest-cooling impact',
        phase1.length > 0 ? String(phase1.length) : '—',
        fmt$(phase1.reduce((s, i) => s + (i.cost ?? 0), 0) || null),
      ],
      [
        'Phase 2 (6–18 mo)',
        'Approved & in-progress',
        phase2.length > 0 ? String(phase2.length) : '—',
        fmt$(phase2.reduce((s, i) => s + (i.cost ?? 0), 0) || null),
      ],
      [
        'Phase 3 (18–36 mo)',
        'Proposed / pending',
        phase3.length > 0 ? String(phase3.length) : '—',
        fmt$(phase3.reduce((s, i) => s + (i.cost ?? 0), 0) || null),
      ],
    ],
    [2, 2, 1.5, 1.5],
  );

  const pdfBuffer = pdf.build();

  const filename = `${scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-council-brief.pdf`;
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
