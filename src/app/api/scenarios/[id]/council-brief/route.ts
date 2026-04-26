import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { PdfBuilder } from '@/lib/pdf';
import { generateDetailedReportSections } from '@/lib/ai/detailedReport';

export const maxDuration = 120;

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtCurrency(n: number | null | undefined, sym: string): string {
  return n != null ? `${sym}${Math.round(n).toLocaleString()}` : 'N/A';
}
function fmtC(n: number | null | undefined): string {
  return n != null ? `-${n.toFixed(1)}\xb0C` : 'N/A';
}
function fmtN(n: number | null | undefined, suffix = ''): string {
  return n != null ? `${n.toLocaleString()}${suffix}` : 'N/A';
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20b9', USD: '$', GBP: '\xa3', EUR: '\u20ac',
  JPY: '\xa5', CNY: '\xa5', KRW: '\u20a9', AUD: 'A$', CAD: 'C$',
  BRL: 'R$', MXN: 'MX$', ZAR: 'R', NGN: '\u20a6', KES: 'KSh',
  AED: 'AED', SGD: 'S$', THB: '\u0e3f', IDR: 'Rp', MYR: 'RM',
  PHP: '\u20b1', PKR: 'Rs', BDT: '\u09f3', EGP: 'E\xa3',
  TRY: '\u20ba', RUB: '\u20bd', CHF: 'CHF', NZD: 'NZ$',
};

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve a robust user context from DB in case JWT/session fields are stale.
  let effectiveUserId = session.user.id;
  let effectiveRole = session.user.role ?? '';
  let effectiveCityId = session.user.cityId;

  const userById = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, cityId: true },
  });

  if (userById) {
    effectiveUserId = userById.id;
    effectiveRole = userById.role ?? effectiveRole;
    effectiveCityId = userById.cityId ?? effectiveCityId;
  } else if (session.user.email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
      select: { id: true, role: true, cityId: true },
    });
    if (userByEmail) {
      effectiveUserId = userByEmail.id;
      effectiveRole = userByEmail.role ?? effectiveRole;
      effectiveCityId = userByEmail.cityId ?? effectiveCityId;
    }
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
            include: {
              place: {
                select: {
                  name: true, vulnerabilityLevel: true,
                  vulnerabilityScore: true, population: true,
                },
              },
            },
          },
        },
      },
      simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
      reports: { orderBy: { generatedAt: 'desc' }, take: 1 },
    },
  });

  if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

  // Roles allowed to view reports (mirrors PERMISSION_MAP.view_reports)
  const VIEW_REPORT_ROLES = [
    'CITY_COUNCIL', 'URBAN_PLANNER', 'CITY_ADMIN', 'SUPER_ADMIN',
    'MUNICIPAL_COMMISSIONER', 'SDMA_OBSERVER', 'DATA_ANALYST',
  ];
  // State-level roles that are not scoped to a single city
  const STATE_LEVEL_ROLES = ['SUPER_ADMIN', 'SDMA_OBSERVER'];
  const role = effectiveRole;

  if (!VIEW_REPORT_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const canAccessByCity = effectiveCityId === scenario.cityId;
  const canAccessByOwnership =
    effectiveUserId === scenario.createdById ||
    (scenario.approvedById != null && effectiveUserId === scenario.approvedById);

  if (!STATE_LEVEL_ROLES.includes(role) && !canAccessByCity && !canAccessByOwnership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse stored content ──────────────────────────────────────────────────

  type Strategy = {
    type: string; name: string; description?: string;
    quantity: number; unitCostLocal: number; totalCostLocal: number;
    tempReductionC: number; co2ReductionTons: number; placementNotes?: string;
  };
  type ReportContent = {
    executiveSummary?: string; impactAnalysis?: string;
    implementationPlan?: string; recommendations?: string;
    riskFactors?: string[]; monitoringPlan?: string;
    strategies?: Strategy[];
    stats?: { totalCostLocal?: number; currencyCode?: string; currencySymbol?: string };
  };
  type SimSummary = {
    tempReductionC?: number; livesSaved?: number; co2ReductionTons?: number;
    energySavingsKwh?: number; costBenefitRatio?: number;
    totalCostLocal?: number; currencyCode?: string;
  };
  type InputState = {
    placeName?: string; countryCode?: string; baselineTempC?: number;
    budgetLocal?: number; timelineMonths?: number; priority?: string;
    treeCanopyPct?: number; imperviousSurfacePct?: number; vulnerabilityScore?: number;
  };

  const reportContent = safeJson<ReportContent>(scenario.reports[0]?.content, {});
  const simSummary = safeJson<SimSummary>(scenario.simulationResults[0]?.outputSummary, {});
  const inputState = safeJson<InputState>(scenario.simulationResults[0]?.inputState, {});

  // Strategies: from report content, else reconstruct from interventions
  const strategies: Strategy[] = reportContent.strategies?.length
    ? reportContent.strategies
    : scenario.scenarioInterventions.map(({ intervention: inv }) => {
        const p = safeJson<Record<string, unknown>>(inv.parameters, {});
        return {
          type: inv.type, name: inv.name, description: inv.description ?? '',
          quantity: Number(p.quantity ?? 1),
          unitCostLocal: Number(p.unitCostLocal ?? inv.estimatedCostUsd ?? 0),
          totalCostLocal: Number(inv.estimatedCostUsd ?? 0),
          tempReductionC: inv.estimatedTempReductionC ?? 0,
          co2ReductionTons: Number(p.co2ReductionTons ?? 0),
          placementNotes: String(p.placementNotes ?? inv.place?.name ?? ''),
        };
      });

  const currencyCode = simSummary.currencyCode ?? reportContent.stats?.currencyCode ?? 'INR';
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] ?? '\u20b9';
  const totalCostLocal = simSummary.totalCostLocal ?? reportContent.stats?.totalCostLocal ?? scenario.totalEstimatedCostUsd ?? 0;
  const tempReduction = simSummary.tempReductionC ?? scenario.totalProjectedTempReductionC ?? 0;
  const livesSaved = simSummary.livesSaved ?? scenario.totalProjectedLivesSaved ?? 0;
  const co2Tons = simSummary.co2ReductionTons ?? scenario.projectedCo2ReductionTons ?? 0;
  const energyKwh = simSummary.energySavingsKwh ?? null;
  const cbr = simSummary.costBenefitRatio ?? null;
  const timeline = inputState.timelineMonths ?? 12;
  const placeName = inputState.placeName ?? scenario.scenarioInterventions[0]?.intervention.place?.name ?? scenario.city.name;
  const countryCode = inputState.countryCode ?? 'in';

  const firstPlace = scenario.scenarioInterventions[0]?.intervention.place;
  const vulnLevel = (firstPlace?.vulnerabilityLevel ?? 'HIGH').toUpperCase();
  const vulnScore = firstPlace?.vulnerabilityScore ?? inputState.vulnerabilityScore ?? 7;
  const population = firstPlace?.population ?? null;

  // ── Find sibling scenario (created within 60s, same city) ────────────────

  const sibling = await prisma.scenario.findFirst({
    where: {
      cityId: scenario.cityId,
      id: { not: scenario.id },
      createdAt: {
        gte: new Date(scenario.createdAt.getTime() - 60_000),
        lte: new Date(scenario.createdAt.getTime() + 60_000),
      },
    },
    include: { simulationResults: { orderBy: { runAt: 'desc' }, take: 1 } },
  });
  const sibSim = safeJson<SimSummary>(sibling?.simulationResults[0]?.outputSummary, {});

  // ── Generate detailed AI sections ─────────────────────────────────────────

  const detailed = await generateDetailedReportSections({
    placeName,
    cityName: scenario.city.name,
    countryName: scenario.city.country,
    countryCode,
    vulnerabilityLevel: vulnLevel,
    vulnerabilityScore: typeof vulnScore === 'number' ? vulnScore : null,
    baselineTempC: inputState.baselineTempC ?? null,
    population,
    treeCanopyPct: inputState.treeCanopyPct ?? null,
    imperviousSurfacePct: inputState.imperviousSurfacePct ?? null,
    projectedTempReductionC: tempReduction,
    projectedLivesSaved: livesSaved,
    projectedCo2ReductionTons: co2Tons,
    strategies: strategies.map(s => ({
      type: s.type, name: s.name, quantity: s.quantity,
      totalCostLocal: s.totalCostLocal, tempReductionC: s.tempReductionC,
      co2ReductionTons: s.co2ReductionTons, placementNotes: s.placementNotes,
    })),
  });

  // ── Build PDF ─────────────────────────────────────────────────────────────

  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const cityCountry = `${scenario.city.name}${scenario.city.state ? ', ' + scenario.city.state : ''}, ${scenario.city.country}`;

  const pdf = new PdfBuilder().setFooter(scenario.city.name);

  // COVER
  pdf.addCoverPage({ placeName, cityCountry, vulnLevel, date: dateStr, scenarioName: scenario.name });

  // TITLE + KEY METRICS
  pdf
    .addTitle('Urban Heat Mitigation \u2014 Scenario Report')
    .addMeta(
      `${cityCountry} \u00b7 ${scenario.status} \u00b7 ${dateStr}` +
      (scenario.createdBy?.name ? ` \u00b7 By ${scenario.createdBy.name}` : ''),
    )
    .addSpace(4)
    .addStatRow([
      { label: 'Total Investment', value: fmtCurrency(totalCostLocal, currencySymbol) },
      { label: 'Temp Reduction', value: fmtC(tempReduction), accent: true },
      { label: 'Lives Protected / Summer', value: fmtN(livesSaved), accent: true },
      { label: cbr != null ? 'Cost-Benefit Ratio' : 'Timeline', value: cbr != null ? `${cbr.toFixed(1)}x ROI` : `${timeline} months` },
    ]);

  // EXECUTIVE SUMMARY
  pdf
    .addH1('Executive Summary')
    .addParagraph(
      detailed.executiveSummary ||
      reportContent.executiveSummary ||
      `The "${scenario.name}" scenario proposes ${strategies.length} urban heat mitigation interventions for ${placeName}, ${scenario.city.name}. Projected to reduce temperatures by ${tempReduction.toFixed(1)}\xb0C and protect ${livesSaved.toLocaleString()} lives each summer, with a total investment of ${fmtCurrency(totalCostLocal, currencySymbol)}.`,
    );

  if (reportContent.impactAnalysis) {
    pdf.addH2('Impact Analysis').addParagraph(reportContent.impactAnalysis);
  }

  // THE PLACE
  pdf
    .addH1(`The Place: ${placeName}`)
    .addStatRow([
      { label: 'Vulnerability Score', value: `${vulnScore}/10`, accent: vulnLevel === 'HIGH' || vulnLevel === 'CRITICAL' },
      { label: 'Vulnerability Level', value: vulnLevel, accent: true },
      { label: 'Population', value: population ? population.toLocaleString() : 'N/A' },
      { label: 'Strategies Proposed', value: String(strategies.length) },
    ])
    .addH2('Vulnerability Breakdown')
    .addParagraph(detailed.placeVulnerabilityBreakdown)
    .addH2('Key Risk Factors')
    .addBulletList(detailed.keyRiskFactors)
    .addH2('Seasonal & Climate Context')
    .addParagraph(detailed.seasonalContext);

  // PROPOSED STRATEGIES
  pdf.addH1('Proposed Strategies');

  for (const s of strategies) {
    const extra = detailed.strategyExtras.find(e => e.type === s.type);
    pdf
      .addH2(
        `${s.name}` +
        (extra?.localName && extra.localName !== s.name ? ` \u2014 ${extra.localName}` : ''),
      )
      .addStatRow([
        { label: 'Quantity', value: s.quantity > 0 ? `${s.quantity.toLocaleString()} units` : 'As surveyed' },
        { label: 'Unit Cost', value: s.unitCostLocal > 0 ? fmtCurrency(s.unitCostLocal, currencySymbol) : 'As tendered' },
        { label: 'Total Cost', value: fmtCurrency(s.totalCostLocal, currencySymbol), accent: true },
        { label: 'Cooling Impact', value: fmtC(s.tempReductionC), accent: true },
      ]);

    if (s.description) pdf.addParagraph(s.description, true);

    const bullets: string[] = [];
    if (extra?.specificLocation) bullets.push(`Location within ${placeName}: ${extra.specificLocation}`);
    if (extra?.speciesOrMaterials) bullets.push(`Species / Materials: ${extra.speciesOrMaterials}`);
    if (s.co2ReductionTons) bullets.push(`CO\u2082 offset: ${s.co2ReductionTons.toFixed(1)} tons/yr (\u2248${(extra?.treesEquivalent ?? Math.round(s.co2ReductionTons * 45)).toLocaleString()} trees equiv.)`);
    if (extra?.bestSeason) bullets.push(`Best season: ${extra.bestSeason}`);
    if (extra?.fundingSource) bullets.push(`Funding source: ${extra.fundingSource}`);
    if (s.placementNotes) bullets.push(`Placement notes: ${s.placementNotes}`);
    if (bullets.length) pdf.addBulletList(bullets, true);
    pdf.addSpace(4);
  }

  // COMBINED IMPACT
  pdf
    .addH1('Combined Impact')
    .addParagraph(detailed.combinedImpactNarrative)
    .addH2('Before / After Projection')
    .addBeforeAfterTable(detailed.beforeAfterTable)
    .addStatRow([
      { label: 'Total Trees Planted', value: fmtN(detailed.totalTreesPlanted), accent: true },
      { label: 'CO\u2082 Reduction / Year', value: `${co2Tons.toFixed(1)} tons` },
      { label: 'Lives Protected', value: fmtN(livesSaved), accent: true },
      { label: energyKwh != null ? 'Energy Savings' : 'Interventions', value: energyKwh != null ? `${Math.round(energyKwh / 1000)}k kWh/yr` : String(strategies.length) },
    ])
    .addCallout(detailed.livesSavedCitation, 'info');

  // IMPLEMENTATION ROADMAP
  pdf
    .addH1('Implementation Roadmap')
    .addTable(
      ['Period', 'Milestone', 'Responsible Party', 'Key Tasks'],
      detailed.roadmap.map(p => [
        p.period, p.milestone, p.responsible,
        (p.tasks ?? []).slice(0, 2).join('; '),
      ]),
      [1.4, 2.2, 1.8, 2.6],
    );

  if ((reportContent.riskFactors ?? []).length > 0) {
    pdf.addH2('Risk Factors').addBulletList(reportContent.riskFactors ?? []);
  }
  if (reportContent.monitoringPlan) {
    pdf.addH2('Monitoring Plan').addParagraph(reportContent.monitoringPlan, true);
  }

  // COMPARISON CITIES
  pdf.addH1('Success Stories from Comparable Cities');
  for (const city of detailed.comparisonCities) {
    pdf
      .addH2(`${city.name}, ${city.country}`)
      .addCallout(city.context, 'info')
      .addParagraph(`What they did: ${city.whatTheyDid}`, true)
      .addCallout(`Results: ${city.results}`, 'success')
      .addSpace(4);
  }

  // NEXT STEPS
  pdf
    .addH1('Next Steps')
    .addH2('Key Contacts & Departments')
    .addBulletList(detailed.contacts)
    .addH2('Funding Applications to Submit')
    .addBulletList(detailed.fundingApplications)
    .addH2('Immediate Actions (First 30 Days)')
    .addBulletList(detailed.immediateActions);

  if (reportContent.recommendations) {
    pdf.addH2('Strategic Recommendations').addParagraph(reportContent.recommendations, true);
  }

  // SCENARIO A vs B COMPARISON
  if (sibling) {
    const sibTemp = sibSim.tempReductionC ?? sibling.totalProjectedTempReductionC ?? 0;
    const sibLives = sibSim.livesSaved ?? sibling.totalProjectedLivesSaved ?? 0;
    const sibCo2 = sibSim.co2ReductionTons ?? sibling.projectedCo2ReductionTons ?? 0;
    const sibCost = sibSim.totalCostLocal ?? sibling.totalEstimatedCostUsd ?? 0;
    const sibCbr = sibSim.costBenefitRatio ?? null;

    pdf
      .addDivider()
      .addH1('Scenario Comparison: A vs B')
      .addMeta(`Scenario A: "${scenario.name}" \u2014 Scenario B: "${sibling.name}"`)
      .addSpace(6)
      .addABCompareTable([
        {
          label: 'Scenario Name',
          valueA: scenario.name.length > 28 ? scenario.name.slice(0, 26) + '..' : scenario.name,
          valueB: sibling.name.length > 28 ? sibling.name.slice(0, 26) + '..' : sibling.name,
        },
        {
          label: 'Total Investment',
          valueA: fmtCurrency(totalCostLocal, currencySymbol),
          valueB: fmtCurrency(sibCost, currencySymbol),
          winnerA: totalCostLocal > 0 && sibCost > 0 ? totalCostLocal <= sibCost : undefined,
        },
        {
          label: 'Temperature Reduction',
          valueA: fmtC(tempReduction),
          valueB: fmtC(sibTemp),
          winnerA: tempReduction >= sibTemp,
        },
        {
          label: 'Lives Protected / Summer',
          valueA: fmtN(livesSaved),
          valueB: fmtN(sibLives),
          winnerA: livesSaved >= sibLives,
        },
        {
          label: 'CO\u2082 Reduction (tons/yr)',
          valueA: co2Tons.toFixed(1),
          valueB: sibCo2.toFixed(1),
          winnerA: co2Tons >= sibCo2,
        },
        {
          label: 'Cost-Benefit Ratio',
          valueA: cbr != null ? `${cbr.toFixed(2)}x` : 'N/A',
          valueB: sibCbr != null ? `${sibCbr.toFixed(2)}x` : 'N/A',
          winnerA: cbr != null && sibCbr != null ? cbr >= sibCbr : undefined,
        },
        {
          label: 'Interventions',
          valueA: String(strategies.length),
          valueB: 'See paired report',
        },
        { label: 'Priority', valueA: scenario.priority ?? 'Not set', valueB: sibling.priority ?? 'Not set' },
      ]);

    pdf.addCallout(
      tempReduction >= sibTemp && livesSaved >= sibLives
        ? `RECOMMENDATION: Scenario A ("${scenario.name}") leads on temperature reduction and lives protected. Recommended for council approval.`
        : `RECOMMENDATION: Review both scenarios with your planning team. Scenario B ("${sibling.name}") may offer advantages on specific metrics.`,
      tempReduction >= sibTemp && livesSaved >= sibLives ? 'success' : 'info',
    );
  }

  // METADATA
  pdf
    .addDivider()
    .addH2('Report Metadata')
    .addTable(
      ['Field', 'Value'],
      [
        ['Scenario ID', scenario.id],
        ['City', cityCountry],
        ['Status', scenario.status],
        ['Priority', scenario.priority ?? 'Not set'],
        ['Created By', scenario.createdBy?.name ?? 'Unknown'],
        ['Approved By', scenario.approvedBy?.name ?? 'Pending'],
        ['Generated', dateStr],
        ['Total Interventions', String(strategies.length)],
        ['Places Covered', String(new Set(scenario.scenarioInterventions.map(si => si.intervention.place?.name ?? 'City-wide')).size)],
      ],
      [1, 2.5],
    );

  const pdfBuffer = pdf.build();
  const filename = `${scenario.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-full-report.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}
