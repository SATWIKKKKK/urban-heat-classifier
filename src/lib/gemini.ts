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
    neighborhood: string;
    cost: number | null;
    coolingC: number | null;
    status?: string;
  }>;
  neighborhoodResults?: Array<{
    neighborhood: string;
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
  const budget = ctx.budget != null ? `$${ctx.budget.toLocaleString()}` : 'a budget';

  return {
    executiveSummary:
      `The "${ctx.scenarioName}" scenario proposes a set of ${ctx.interventions.length} ` +
      `urban heat mitigation interventions for ${ctx.cityName}. ` +
      `If implemented, this plan is projected to reduce average temperatures by ${cool}, ` +
      `protecting approximately ${lives} residents from heat-related illness or death each summer. ` +
      `The total estimated investment is ${budget}.`,

    impactAnalysis:
      `This plan targets ${ctx.interventions.length} distinct interventions spanning ` +
      `${[...new Set(ctx.interventions.map((i) => i.neighborhood))].length} neighborhoods. ` +
      (ctx.co2Tons
        ? `Beyond direct health benefits, implementation would offset approximately ${ctx.co2Tons} metric tons of CO2 per year. `
        : '') +
      (ctx.costBenefitRatio
        ? `The cost-benefit ratio of ${ctx.costBenefitRatio.toFixed(2)} indicates that every dollar invested returns substantial public health value. `
        : '') +
      `The combination of tree planting, green infrastructure, and reflective surfaces creates synergistic cooling effects that compound over time.`,

    recommendations:
      `1. Prioritize interventions in the highest-vulnerability neighborhoods first to maximize lives protected per dollar spent.\n` +
      `2. Establish a monitoring program to track temperature changes and health outcomes against baseline measurements.\n` +
      `3. Pursue federal and state resilience funding to supplement the ${budget} municipal budget.\n` +
      `4. Coordinate with local utilities to capture energy savings from cool-roof and green-roof installations.`,
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
          maxOutputTokens: 1200,
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
      'Write in clear, jargon-free language any resident can understand. Focus on community benefits, lives saved, and quality of life.',
    TECHNICAL:
      'Write in precise technical language suitable for urban planners and engineers. Include specific metrics, methodologies, and references to best practices.',
    EXECUTIVE:
      'Write concisely for senior city officials. Lead with ROI, strategic alignment, and headline numbers. Be decisive and action-oriented.',
  }[ctx.tone];

  const interventionLines = ctx.interventions
    .map(
      (i) =>
        `  - ${i.name} | ${i.type.replace(/_/g, ' ')} | ${i.neighborhood} | ` +
        `Cost: ${i.cost != null ? '$' + i.cost.toLocaleString() : 'TBD'} | ` +
        `Cooling: ${i.coolingC != null ? '-' + i.coolingC.toFixed(1) + '°C' : 'TBD'}`
    )
    .join('\n');

  const neighborhoodLines = ctx.neighborhoodResults?.length
    ? '\nNEIGHBORHOOD SIMULATION RESULTS:\n' +
      ctx.neighborhoodResults
        .map((n) => `  - ${n.neighborhood}: -${n.reductionCelsius.toFixed(1)}°C, ${n.livesSaved} lives protected`)
        .join('\n')
    : '';

  return `You are an expert urban heat analyst writing an official ${ctx.reportType} for a city government.
${toneGuide}

SCENARIO: ${ctx.scenarioName}
CITY: ${ctx.cityName}${ctx.cityState ? ', ' + ctx.cityState : ''}
DESCRIPTION: ${ctx.description ?? 'Not provided'}
PRIORITY: ${ctx.priority ?? 'Not set'}
TOTAL BUDGET: ${ctx.budget != null ? '$' + ctx.budget.toLocaleString() : 'TBD'}
PROJECTED COOLING: ${ctx.coolingCelsius != null ? '-' + ctx.coolingCelsius.toFixed(1) + '°C' : 'TBD'}
LIVES PROTECTED / SUMMER: ${ctx.livesProtected ?? 'TBD'}
CO2 REDUCTION: ${ctx.co2Tons != null ? ctx.co2Tons + ' tons/year' : 'TBD'}
${ctx.energySavingsKwh != null ? 'ENERGY SAVINGS: ' + ctx.energySavingsKwh.toLocaleString() + ' kWh/year' : ''}
${ctx.costBenefitRatio != null ? 'COST-BENEFIT RATIO: ' + ctx.costBenefitRatio.toFixed(2) : ''}
${ctx.councilNotes ? 'COUNCIL NOTES: ' + ctx.councilNotes : ''}

INTERVENTIONS (${ctx.interventions.length}):
${interventionLines}
${neighborhoodLines}

Generate a structured report with EXACTLY these three sections. Use plain text only — no markdown, no asterisks, no #.

EXECUTIVE SUMMARY:
[Write 3-4 sentences. Be specific with the numbers above. State what this plan is, what it achieves, and why it matters for ${ctx.cityName}.]

IMPACT ANALYSIS:
[Write 4-6 sentences. Cover: health impact (lives), environmental (CO2, tree canopy), economic (energy savings, cost-benefit), and which neighborhoods benefit most. Reference specific interventions by name where relevant.]

RECOMMENDATIONS:
[Write 3-4 numbered action steps. Be concrete, actionable, and specific to this scenario and city.]`.trim();
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
