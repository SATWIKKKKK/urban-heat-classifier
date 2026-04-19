/**
 * Gemini 1.5 Flash — report narrative generation.
 * Uses the REST API directly — no SDK needed.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScenarioReportContext {
  scenarioName: string;
  cityName: string;
  cityState?: string | null;
  description?: string | null;
  budget: number | null;
  livesProtected: number | null;
  coolingCelsius: number | null;
  co2Tons: number | null;
  energySavingsKwh?: number | null;
  costBenefitRatio?: number | null;
  priority: string | null;
  tone: 'ACCESSIBLE' | 'TECHNICAL' | 'EXECUTIVE';
  reportType: string;
  interventions: Array<{
    name: string;
    type: string;
    place: string;
    cost: number | null;
    coolingC: number | null;
    status?: string;
  }>;
  placeResults?: Array<{
    place: string;
    reductionCelsius: number;
    livesSaved: number;
  }>;
  councilNotes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
}

export interface ReportNarrative {
  executiveSummary: string;
  impactAnalysis: string;
  recommendations: string;
}

// ── Fallback (when Gemini is unavailable) ─────────────────────────────────────

function buildFallback(ctx: ScenarioReportContext): ReportNarrative {
  const cool = ctx.coolingCelsius != null ? `${ctx.coolingCelsius.toFixed(1)}°C` : 'a measurable amount';
  const lives = ctx.livesProtected ?? 0;
  const budget = ctx.budget != null ? `₹${ctx.budget.toLocaleString()}` : 'a dedicated budget';
  const interventionTypes = [...new Set(ctx.interventions.map((i) => i.type.replace(/_/g, ' ')))].join(', ');
  const places = [...new Set(ctx.interventions.map((i) => i.place))];
  const placeCount = places.length;

  return {
    executiveSummary:
      `The "${ctx.scenarioName}" scenario proposes ${ctx.interventions.length} evidence-based urban heat mitigation interventions for ${ctx.cityName}. ` +
      `These interventions span ${placeCount} place${placeCount !== 1 ? 's' : ''} and include ${interventionTypes}. ` +
      `If implemented, this plan is projected to reduce average surface temperatures by ${cool}, protecting approximately ${lives.toLocaleString()} residents from heat-related illness or death each summer. ` +
      `The total estimated investment is ${budget}${ctx.costBenefitRatio != null ? `, delivering a cost-benefit ratio of ${ctx.costBenefitRatio.toFixed(2)}:1` : ''}. ` +
      `With India experiencing some of the world's most severe urban heat island effects — particularly in Tier-2 cities — this plan represents a critical and time-sensitive investment in public health, environmental resilience, and equitable urban development for ${ctx.cityName}.`,

    impactAnalysis:
      `Health Impact: This plan targets ${ctx.interventions.length} distinct interventions, each designed to lower ambient air temperatures in high-exposure zones. ` +
      `Based on WHO heat-mortality regression models, a ${cool} reduction in average temperatures during peak summer months is projected to prevent ${lives.toLocaleString()} heat-related deaths per season, disproportionately benefiting elderly residents aged 60+ and children under 5, who together represent the highest-risk demographic cohorts. ` +
      `Environmental Impact: Beyond immediate health benefits, implementation would offset approximately ${ctx.co2Tons != null ? ctx.co2Tons.toFixed(1) + ' metric tons' : 'significant quantities'} of CO₂ per year through increased vegetation and reduced energy demand. ` +
      `Expanded tree canopy coverage and green infrastructure will enhance biodiversity, reduce stormwater runoff, and create compounding cooling effects that intensify over 5–10 years as plantings mature. ` +
      `Economic Impact: ${ctx.energySavingsKwh != null ? `An estimated ${Math.round(ctx.energySavingsKwh / 1000)}k kWh per year in energy savings from reduced air conditioning load translates to lower household electricity bills across affected wards. ` : ''}` +
      `${ctx.costBenefitRatio != null ? `The cost-benefit ratio of ${ctx.costBenefitRatio.toFixed(2)}:1 indicates that every rupee invested in this programme returns more than ${Math.floor(ctx.costBenefitRatio)} rupees in public health value, reduced healthcare costs, and productivity gains. ` : ''}` +
      `Equity Dimension: Prioritisation of high-vulnerability places ensures that communities with the least access to private cooling — lower-income wards, high-density slum clusters, and areas with elderly populations — receive the greatest per-capita benefit, directly addressing the structural inequity embedded in urban heat exposure.`,

    recommendations:
      `1. IMMEDIATE (0–3 months): Deploy interventions in the highest-vulnerability places first to maximise lives protected per rupee spent. Begin with "${ctx.interventions[0]?.name || 'the highest-priority intervention'}" in ${ctx.interventions[0]?.place || 'the priority place'}, as it offers the greatest temperature reduction impact. Fast-track procurement and community consultation for this phase.\n\n` +
      `2. MONITORING (start at month 1): Establish a ward-level monitoring programme using a combination of IoT-enabled temperature sensors, satellite LST (Land Surface Temperature) data from ISRO Bhuvan, and health outcome tracking via PHC (Primary Health Centre) records. Set baseline measurements before deployment and track ΔT changes monthly over 24 months.\n\n` +
      `3. FUNDING (months 1–6): Apply immediately for co-financing through AMRUT 2.0 (Urban Infrastructure Development), the Smart Cities Mission's climate resilience sub-component, and the National Adaptation Fund for Climate Change (NAFCC) administered by NABARD. Engage the State Disaster Management Authority (SDMA) for emergency climate funding given the critical vulnerability classification.\n\n` +
      `4. COMMUNITY ENGAGEMENT (ongoing): Partner with ward-level Resident Welfare Associations (RWAs), local NGOs, and self-help groups to run community heat safety awareness campaigns. Involve ward committees in intervention site selection, ensure maintenance agreements are signed before deployment, and establish a community feedback hotline to track on-ground conditions throughout implementation.`,
  };
}

// ── Gemini REST call ──────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) return '';

  try {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!res.ok) {
      console.error('[gemini] API error', res.status);
      return '';
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } catch (err) {
    console.error('[gemini] fetch error', err);
    return '';
  }
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(ctx: ScenarioReportContext): string {
  const toneGuide = {
    ACCESSIBLE:
      'Write in clear, jargon-free language a newspaper reader can understand. Focus on human stories: lives saved, places cooled, shade created. Use short sentences. Avoid acronyms.',
    TECHNICAL:
      'Write in precise technical language for urban planners and civil engineers. Include UHI intensity deltas (ΔT), albedo coefficients, canopy coverage percentages, WHO heat-mortality regression references, and cite best-practice frameworks (C40 Cities, EPA Green Infrastructure guidelines). Use SI units throughout.',
    EXECUTIVE:
      'Write for a busy city mayor or municipal commissioner who will skim in 90 seconds. Lead every paragraph with the single most important number. Use bold cost-benefit framing. End with a clear call to action.',
  }[ctx.tone];

  const interventionLines = ctx.interventions
    .map(
      (i, idx) =>
        `  ${idx + 1}. ${i.name}\n     Type: ${i.type.replace(/_/g, ' ')}\n     Place: ${i.place}\n     Cost: ${i.cost != null ? '₹' + i.cost.toLocaleString() : 'TBD'}\n     Projected cooling: ${i.coolingC != null ? '-' + i.coolingC.toFixed(1) + '°C' : 'TBD'}\n     Status: ${i.status || 'PROPOSED'}`
    )
    .join('\n');

  const placeLines = ctx.placeResults?.length
    ? '\nPLACE-LEVEL SIMULATION RESULTS:\n' +
      ctx.placeResults
        .map(
          (n) =>
            `  - ${n.place}: ΔT = -${n.reductionCelsius.toFixed(2)}°C | Lives protected per summer: ${n.livesSaved}`
        )
        .join('\n')
    : '';

  return `You are an expert urban heat island (UHI) analyst working for an Indian city government. You produce official ${ctx.reportType} documents used by city councils and state disaster management authorities.

WRITING STYLE:
${toneGuide}

CONTEXT:
Scenario: "${ctx.scenarioName}"
City: ${ctx.cityName}${ctx.cityState ? ', ' + ctx.cityState : ''}, India
Description: ${ctx.description || 'Not provided'}
Priority classification: ${ctx.priority || 'Not classified'}
${ctx.createdBy ? 'Prepared by: ' + ctx.createdBy : ''}
${ctx.approvedBy ? 'Approved by: ' + ctx.approvedBy : ''}

KEY METRICS:
- Total budget: ${ctx.budget != null ? '₹' + ctx.budget.toLocaleString() : 'TBD'}
- Projected temperature reduction: ${ctx.coolingCelsius != null ? '-' + ctx.coolingCelsius.toFixed(2) + '°C' : 'TBD'}
- Lives protected per summer season: ${ctx.livesProtected ?? 'TBD'}
- CO₂ offset: ${ctx.co2Tons != null ? ctx.co2Tons.toFixed(1) + ' metric tons/year' : 'TBD'}
${ctx.energySavingsKwh != null ? '- Energy savings: ' + ctx.energySavingsKwh.toLocaleString() + ' kWh/year' : ''}
${ctx.costBenefitRatio != null ? '- Cost-benefit ratio: ' + ctx.costBenefitRatio.toFixed(2) + ':1' : ''}

INTERVENTIONS (${ctx.interventions.length} total):
${interventionLines}
${placeLines}

${ctx.councilNotes ? 'COUNCIL / COMMISSIONER NOTES:\n' + ctx.councilNotes + '\n' : ''}

INSTRUCTIONS:
Generate a structured report with EXACTLY these three sections. Write plain text only — no markdown, no asterisks, no hashtags, no bullet-point symbols at line starts.

EXECUTIVE SUMMARY:
Write 4-6 sentences. Open with the single most impactful statistic. State what this plan is, the total investment, the projected lives saved, and the temperature reduction. End with why this matters specifically for ${ctx.cityName} given India's extreme heat trends.

IMPACT ANALYSIS:
Write 6-8 sentences organized into these sub-themes:
a) Health impact — use WHO heat-mortality data; reference lives saved, vulnerable demographics (elderly ≥60, children ≤5).
b) Environmental — CO₂ offset, increased tree canopy, reduced urban heat island intensity.
c) Economic — energy savings from reduced AC load, cost-benefit ratio, property value uplift in greened places.
d) Place equity — which places benefit most, how this addresses existing disparities.
Reference specific interventions by name when discussing their impact.

RECOMMENDATIONS:
Write exactly 4 numbered action items. Each must be concrete, time-bound where possible, and specific to ${ctx.cityName}:
1. An implementation sequencing recommendation (which intervention to deploy first and why).
2. A monitoring and measurement recommendation (how to track ΔT and health outcomes).
3. A funding and partnership recommendation (specific Indian government schemes like AMRUT, Smart Cities Mission, or state climate funds).
4. A community engagement recommendation (how to involve ward committees, RWAs, or NGOs).`.trim();
}

// ── Parse Gemini output ───────────────────────────────────────────────────────

function parseNarrative(raw: string): ReportNarrative | null {
  const execMatch = raw.match(/EXECUTIVE SUMMARY:\s*([\s\S]*?)(?=\n\s*IMPACT ANALYSIS:|$)/i);
  const impactMatch = raw.match(/IMPACT ANALYSIS:\s*([\s\S]*?)(?=\n\s*RECOMMENDATIONS:|$)/i);
  const recMatch = raw.match(/RECOMMENDATIONS:\s*([\s\S]*?)$/i);

  if (!execMatch && !impactMatch && !recMatch) return null;

  return {
    executiveSummary: execMatch?.[1]?.trim() ?? '',
    impactAnalysis: impactMatch?.[1]?.trim() ?? '',
    recommendations: recMatch?.[1]?.trim() ?? '',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateReportNarrative(ctx: ScenarioReportContext): Promise<ReportNarrative> {
  const raw = await callGemini(buildPrompt(ctx));
  if (!raw) return buildFallback(ctx);

  const parsed = parseNarrative(raw);
  if (!parsed) return buildFallback(ctx);

  // Fill in any empty sections with fallback
  const fallback = buildFallback(ctx);
  return {
    executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
    impactAnalysis: parsed.impactAnalysis || fallback.impactAnalysis,
    recommendations: parsed.recommendations || fallback.recommendations,
  };
}
