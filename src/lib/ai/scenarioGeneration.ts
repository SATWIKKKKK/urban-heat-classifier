/**
 * Gemini 2.0 Flash — scenario generation for urban heat mitigation.
 * Produces both Scenario A (recommended) and Scenario B (alternative)
 * in a single API call, with full cost breakdown in local currency.
 */

import { aiChat } from '@/lib/ai/client';

// Note: the aiChat helper will prefer AICREDITS/OPENAI keys then fallback to OpenRouter.

// ── Input / Output types ──────────────────────────────────────────────────────

export interface ScenarioGenerationInput {
  placeName: string;
  cityName: string;
  stateName?: string | null;
  countryName: string;
  countryCode: string;        // ISO 3166-1 alpha-2
  latitude: number;
  longitude: number;
  population?: number | null;
  baselineTempC?: number | null;
  treeCanopyPct?: number | null;
  imperviousSurfacePct?: number | null;
  vulnerabilityScore?: number | null;
  vulnerabilityLevel?: string | null;

  // User-configured
  selectedStrategies: string[];   // e.g. ['TREE_PLANTING', 'GREEN_ROOF', ...]
  budgetLocal?: number | null;    // in local currency
  timelineMonths?: number | null;
  priority?: 'HEALTH' | 'ENVIRONMENT' | 'COST_EFFECTIVE' | 'EQUITY' | null;

  // Optional live weather
  currentTempC?: number | null;
  currentHumidity?: number | null;
  todayMaxC?: number | null;
}

export interface GeneratedScenario {
  name: string;
  description: string;
  strategies: GeneratedStrategy[];
  totalCostLocal: number;
  currencyCode: string;
  currencySymbol: string;
  projectedTempReductionC: number;
  projectedLivesSaved: number;
  projectedCo2ReductionTons: number;
  projectedEnergySavingsKwh: number;
  costBenefitRatio: number;
  timelineMonths: number;
  executiveSummary: string;
  impactAnalysis: string;
  implementationPlan: string;
  recommendations: string;
  riskFactors: string[];
  monitoringPlan: string;
}

export interface GeneratedStrategy {
  type: string;
  name: string;
  description: string;
  quantity: number;
  unitCostLocal: number;
  totalCostLocal: number;
  tempReductionC: number;
  co2ReductionTons: number;
  placementNotes: string;
}

export interface ScenarioGenerationResult {
  scenarioA: GeneratedScenario;
  scenarioB: GeneratedScenario;
}

// ── Currency mapping ──────────────────────────────────────────────────────────

const COUNTRY_CURRENCY: Record<string, { code: string; symbol: string }> = {
  in: { code: 'INR', symbol: '₹' },
  us: { code: 'USD', symbol: '$' },
  gb: { code: 'GBP', symbol: '£' },
  eu: { code: 'EUR', symbol: '€' },
  de: { code: 'EUR', symbol: '€' },
  fr: { code: 'EUR', symbol: '€' },
  es: { code: 'EUR', symbol: '€' },
  it: { code: 'EUR', symbol: '€' },
  nl: { code: 'EUR', symbol: '€' },
  be: { code: 'EUR', symbol: '€' },
  at: { code: 'EUR', symbol: '€' },
  pt: { code: 'EUR', symbol: '€' },
  fi: { code: 'EUR', symbol: '€' },
  ie: { code: 'EUR', symbol: '€' },
  gr: { code: 'EUR', symbol: '€' },
  jp: { code: 'JPY', symbol: '¥' },
  cn: { code: 'CNY', symbol: '¥' },
  kr: { code: 'KRW', symbol: '₩' },
  au: { code: 'AUD', symbol: 'A$' },
  ca: { code: 'CAD', symbol: 'C$' },
  br: { code: 'BRL', symbol: 'R$' },
  mx: { code: 'MXN', symbol: 'MX$' },
  za: { code: 'ZAR', symbol: 'R' },
  ng: { code: 'NGN', symbol: '₦' },
  ke: { code: 'KES', symbol: 'KSh' },
  ae: { code: 'AED', symbol: 'د.إ' },
  sa: { code: 'SAR', symbol: '﷼' },
  sg: { code: 'SGD', symbol: 'S$' },
  th: { code: 'THB', symbol: '฿' },
  id: { code: 'IDR', symbol: 'Rp' },
  my: { code: 'MYR', symbol: 'RM' },
  ph: { code: 'PHP', symbol: '₱' },
  pk: { code: 'PKR', symbol: '₨' },
  bd: { code: 'BDT', symbol: '৳' },
  lk: { code: 'LKR', symbol: 'Rs' },
  eg: { code: 'EGP', symbol: 'E£' },
  tr: { code: 'TRY', symbol: '₺' },
  ru: { code: 'RUB', symbol: '₽' },
  pl: { code: 'PLN', symbol: 'zł' },
  se: { code: 'SEK', symbol: 'kr' },
  no: { code: 'NOK', symbol: 'kr' },
  dk: { code: 'DKK', symbol: 'kr' },
  ch: { code: 'CHF', symbol: 'CHF' },
  nz: { code: 'NZD', symbol: 'NZ$' },
  ar: { code: 'ARS', symbol: 'AR$' },
  cl: { code: 'CLP', symbol: 'CL$' },
  co: { code: 'COP', symbol: 'COL$' },
  pe: { code: 'PEN', symbol: 'S/' },
};

function getCurrency(countryCode: string) {
  return COUNTRY_CURRENCY[countryCode.toLowerCase()] ?? { code: 'USD', symbol: '$' };
}

// ── Strategy display names ────────────────────────────────────────────────────

const STRATEGY_NAMES: Record<string, string> = {
  TREE_PLANTING: 'Tree Planting & Urban Forestry',
  GREEN_ROOF: 'Green Roof Installation',
  COOL_PAVEMENT: 'Cool Pavement (Reflective Coating)',
  COOL_ROOF: 'Cool Roof (High-Albedo Coating)',
  PERMEABLE_PAVEMENT: 'Permeable Pavement',
  URBAN_GARDEN: 'Urban Garden & Green Space',
  MIST_STATION: 'Public Misting Station',
  SHADE_STRUCTURE: 'Shade Structure & Canopy',
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildSinglePrompt(
  input: ScenarioGenerationInput,
  variant: 'A' | 'B',
  scenarioAName?: string,
): string {
  const currency = getCurrency(input.countryCode);
  const strategyList = input.selectedStrategies
    .map(s => STRATEGY_NAMES[s] ?? s.replace(/_/g, ' '))
    .join(', ');

  const budgetLine = input.budgetLocal
    ? `Budget: ${currency.symbol}${input.budgetLocal.toLocaleString()} ${currency.code}.`
    : 'No specific budget — propose a realistic one.';

  const variantInstruction =
    variant === 'A'
      ? 'This is the RECOMMENDED plan — optimal balance of impact, cost, and feasibility, suitable for presenting to a city council.'
      : `This is the ALTERNATIVE plan — must differ meaningfully from "${scenarioAName ?? 'Scenario A'}". Use a different approach: more aggressive, more budget-conscious, or focusing on different interventions.`;

  return `You are an expert urban heat island mitigation planner. Generate ONE scenario plan as valid JSON.

Location: ${input.placeName}, ${input.cityName}${input.stateName ? `, ${input.stateName}` : ''}, ${input.countryName}
Population: ${input.population?.toLocaleString() ?? 'Unknown'}
Baseline temp: ${input.baselineTempC != null ? `${input.baselineTempC}°C` : 'Unknown'}
Strategies to use: ${strategyList}
${budgetLine}
Timeline: ${input.timelineMonths ? `${input.timelineMonths} months` : 'propose realistic'}
${input.priority ? `Priority: ${input.priority.replace(/_/g, ' ')}` : ''}
Currency: ${currency.code} (${currency.symbol})

${variantInstruction}

Keep every string value on a single line. Be concise and avoid long paragraphs.

Output ONLY raw JSON (no markdown, no explanation):
{
  "name": "creative scenario name",
  "description": "1 short sentence or 2 very short sentences",
  "strategies": [
    {
      "type": "TREE_PLANTING",
      "name": "string",
      "description": "1 sentence",
      "quantity": 100,
      "unitCostLocal": 5000,
      "totalCostLocal": 500000,
      "tempReductionC": 0.5,
      "co2ReductionTons": 50,
      "placementNotes": "1 sentence"
    }
  ],
  "totalCostLocal": 500000,
  "currencyCode": "${currency.code}",
  "currencySymbol": "${currency.symbol}",
  "projectedTempReductionC": 1.2,
  "projectedLivesSaved": 45,
  "projectedCo2ReductionTons": 120,
  "projectedEnergySavingsKwh": 50000,
  "costBenefitRatio": 3.5,
  "timelineMonths": 12,
  "executiveSummary": "1-2 short sentences",
  "impactAnalysis": "2 short sentences on health, environment, economy",
  "implementationPlan": "Phase 1: ... Phase 2: ... Phase 3: ...",
  "recommendations": "1. action  2. action  3. action",
  "riskFactors": ["risk1", "risk2", "risk3"],
  "monitoringPlan": "1 short sentence"
}`;
}

// ── Robust JSON extractor ────────────────────────────────────────────────────

function extractJson(raw: string): string {
  let s = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = s.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in model response');
  s = s.slice(start);
  let depth = 0, end = -1, inString = false, escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end !== -1) return s.slice(0, end + 1);

  if (escape) s = s.slice(0, -1);
  if (inString) s += '"';

  s = s.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, '').replace(/,\s*"[^"]*"\s*:\s*$/, '').replace(/,\s*"[^"]*"\s*$/, '');
  const opens: string[] = [];
  inString = false; escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') opens.push('}');
    else if (ch === '[') opens.push(']');
    else if (ch === '}' || ch === ']') opens.pop();
  }
  return s + opens.reverse().join('');
}

function trimLastTopLevelProperty(json: string): string | null {
  let depth = 0;
  let lastComma = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
    else if (ch === ',' && depth === 1) lastComma = i;
  }

  if (lastComma === -1) return null;
  return `${json.slice(0, lastComma)}}`;
}

function parseJsonWithRepair(raw: string): Record<string, unknown> {
  let candidate = extractJson(raw);
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const parsed = JSON.parse(candidate);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Model response was not a JSON object');
      }
      return parsed as Record<string, unknown>;
    } catch (error) {
      lastError = error as Error;
      const trimmed = trimLastTopLevelProperty(candidate);
      if (!trimmed || trimmed === candidate) break;
      candidate = trimmed;
    }
  }

  throw lastError ?? new Error('Failed to parse JSON object');
}

// ── Single scenario API call ──────────────────────────────────────────────────

async function callOnce(prompt: string): Promise<GeneratedScenario> {
  const text = await aiChat({ messages: [{ role: 'user', content: prompt }], model: process.env.AI_PREFERRED_MODEL, temperature: 0.3, maxTokens: 4096, timeoutMs: 120_000 });
  if (!text) throw new Error('AI returned empty response');

  let parsed: GeneratedScenario;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = parseJsonWithRepair(text);
    // Model might wrap in scenarioA / scenario / result key
    const unwrapped =
      raw.name != null
        ? raw
        : raw.scenarioA ?? raw.scenario ?? raw.result ?? raw.plan ?? Object.values(raw)[0];
    if (!unwrapped || typeof unwrapped !== 'object') {
      throw new Error(`Unexpected top-level keys: ${Object.keys(raw).join(', ')}`);
    }
    const strategies = Array.isArray(unwrapped.strategies ?? unwrapped.interventions)
      ? unwrapped.strategies ?? unwrapped.interventions
      : [];
    parsed = {
      ...unwrapped,
      name: typeof unwrapped.name === 'string'
        ? unwrapped.name
        : typeof unwrapped.title === 'string'
          ? unwrapped.title
          : 'Unnamed Scenario',
      description: typeof unwrapped.description === 'string' ? unwrapped.description : '',
      strategies,
      totalCostLocal: Number(unwrapped.totalCostLocal ?? 0),
      currencyCode: typeof unwrapped.currencyCode === 'string' ? unwrapped.currencyCode : '',
      currencySymbol: typeof unwrapped.currencySymbol === 'string' ? unwrapped.currencySymbol : '',
      projectedTempReductionC: Number(unwrapped.projectedTempReductionC ?? 0),
      projectedLivesSaved: Number(unwrapped.projectedLivesSaved ?? 0),
      projectedCo2ReductionTons: Number(unwrapped.projectedCo2ReductionTons ?? 0),
      projectedEnergySavingsKwh: Number(unwrapped.projectedEnergySavingsKwh ?? 0),
      costBenefitRatio: Number(unwrapped.costBenefitRatio ?? 0),
      timelineMonths: Number(unwrapped.timelineMonths ?? 0),
      executiveSummary: typeof unwrapped.executiveSummary === 'string' ? unwrapped.executiveSummary : '',
      impactAnalysis: typeof unwrapped.impactAnalysis === 'string' ? unwrapped.impactAnalysis : '',
      implementationPlan: typeof unwrapped.implementationPlan === 'string' ? unwrapped.implementationPlan : '',
      recommendations: typeof unwrapped.recommendations === 'string' ? unwrapped.recommendations : '',
      riskFactors: Array.isArray(unwrapped.riskFactors)
        ? unwrapped.riskFactors.filter((value: unknown): value is string => typeof value === 'string')
        : [],
      monitoringPlan: typeof unwrapped.monitoringPlan === 'string' ? unwrapped.monitoringPlan : '',
    } as GeneratedScenario;
  } catch (e) {
    console.error('[scenarioGen] parse error. Text snippet:\n', (text || '').slice(0, 600));
    throw new Error(`Failed to parse AI response: ${(e as Error).message}`);
  }

  if (!parsed.strategies?.length) throw new Error('AI response missing strategies');
  return parsed;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateScenarios(
  input: ScenarioGenerationInput,
): Promise<ScenarioGenerationResult> {
  const hasKey = Boolean(process.env.AICREDITS_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);
  if (!hasKey) throw new Error('AI API key not configured (AICREDITS/OPENAI/OPENROUTER)');

  // Call A first, then B (sequential to avoid rate limits)
  const scenarioA = await callOnce(buildSinglePrompt(input, 'A'));
  const scenarioB = await callOnce(buildSinglePrompt(input, 'B', scenarioA.name));

  return { scenarioA, scenarioB };
}

export { getCurrency, STRATEGY_NAMES };
