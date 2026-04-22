/**
 * Gemini-powered scenario comparison report.
 * Generates a dual-scenario A/B analysis for urban heat mitigation planning.
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'nvidia/nemotron-3-nano-30b-a3b:free';

export interface ScenarioSummary {
  name: string;
  description?: string | null;
  budget: number | null;
  livesProtected: number | null;
  coolingCelsius: number | null;
  interventionCount: number;
  interventions: Array<{
    name: string;
    type: string;
    place: string;
    cost: number | null;
    coolingC: number | null;
  }>;
}

export interface DualScenarioInput {
  cityName: string;
  scenarioA: ScenarioSummary;
  scenarioB: ScenarioSummary;
}

export async function generateDualScenarioReport(input: DualScenarioInput): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return 'Gemini API key not configured.';
  }

  const formatScenario = (s: ScenarioSummary, label: string) => `
${label}: "${s.name}"
${s.description ? `Description: ${s.description}` : ''}
Budget: $${s.budget?.toLocaleString() ?? 'Not set'}
Projected Lives Protected: ${s.livesProtected?.toLocaleString() ?? 'Unknown'}
Projected Cooling: ${s.coolingCelsius?.toFixed(1) ?? 'Unknown'}°C reduction
Interventions (${s.interventionCount}):
${s.interventions.map((i) => `  - ${i.name} (${i.type.replace(/_/g, ' ')}) in ${i.place}: $${i.cost?.toLocaleString() ?? '?'}, -${i.coolingC?.toFixed(1) ?? '?'}°C`).join('\n')}`;

  const prompt = `You are an urban planning consultant specializing in heat mitigation. Compare these two intervention scenarios for ${input.cityName} and provide a professional analysis.

${formatScenario(input.scenarioA, 'SCENARIO A')}

${formatScenario(input.scenarioB, 'SCENARIO B')}

Provide a structured comparison report (400-600 words) covering:

1. **Executive Summary**: Which scenario is recommended and why? Consider cost-effectiveness, coverage, and impact.

2. **Cost-Benefit Analysis**: Compare the cost per degree of cooling and cost per life protected for each scenario.

3. **Coverage Assessment**: Which scenario provides better geographic and demographic coverage?

4. **Risk Analysis**: What are the risks of each approach? Which is more resilient?

5. **Implementation Priority**: If combining elements from both scenarios, what would the ideal phased plan look like?

6. **Recommendation**: Clear recommendation with reasoning.

Use bullet points and concise language. This will be included in a PDF report for city planners.`;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://urban-heat-mitigator.vercel.app',
      'X-Title': 'Urban Heat Mitigator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    console.error('OpenRouter scenario report error:', await res.text());
    return 'Failed to generate scenario comparison report.';
  }

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ??
    'No report generated.'
  );
}
