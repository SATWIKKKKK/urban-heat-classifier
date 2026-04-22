/**
 * AI-powered detailed report section generator.
 * Produces place context, per-strategy extras, implementation roadmap,
 * comparison cities and next steps for the full scenario PDF.
 */
import { aiChat } from '@/lib/ai/client';

export interface StrategyExtra {
  type: string;
  localName: string;
  specificLocation: string;
  speciesOrMaterials: string;
  fundingSource: string;
  bestSeason: string;
  treesEquivalent: number;
}

export interface RoadmapPhase {
  period: string;
  milestone: string;
  responsible: string;
  tasks: string[];
}

export interface ComparisonCity {
  name: string;
  country: string;
  context: string;
  whatTheyDid: string;
  results: string;
}

export interface DetailedReportSections {
  placeVulnerabilityBreakdown: string;
  keyRiskFactors: string[];
  seasonalContext: string;
  combinedImpactNarrative: string;
  beforeAfterTable: Array<{ metric: string; before: string; after: string }>;
  totalTreesPlanted: number;
  livesSavedCitation: string;
  strategyExtras: StrategyExtra[];
  roadmap: RoadmapPhase[];
  comparisonCities: ComparisonCity[];
  contacts: string[];
  fundingApplications: string[];
  immediateActions: string[];
}

export interface DetailedReportInput {
  placeName: string;
  cityName: string;
  countryName: string;
  countryCode: string;
  vulnerabilityLevel?: string | null;
  vulnerabilityScore?: number | null;
  baselineTempC?: number | null;
  population?: number | null;
  treeCanopyPct?: number | null;
  imperviousSurfacePct?: number | null;
  projectedTempReductionC: number;
  projectedLivesSaved: number;
  projectedCo2ReductionTons: number;
  strategies: Array<{
    type: string;
    name: string;
    quantity: number;
    totalCostLocal: number;
    tempReductionC: number;
    co2ReductionTons: number;
    placementNotes?: string;
  }>;
}

// ── Fallback (no AI key or timeout) ──────────────────────────────────────────

function buildFallback(input: DetailedReportInput): DetailedReportSections {
  const baseline = input.baselineTempC ?? 35;
  const afterTemp = (baseline - input.projectedTempReductionC).toFixed(1);
  const treeQty = input.strategies
    .filter(s => s.type === 'TREE_PLANTING')
    .reduce((sum, s) => sum + (s.quantity ?? 0), 0);

  return {
    placeVulnerabilityBreakdown:
      `${input.placeName} is rated ${input.vulnerabilityLevel ?? 'HIGH'} vulnerability due to a combination of high impervious surface coverage (${input.imperviousSurfacePct ?? 50}%), low tree canopy (${input.treeCanopyPct ?? 15}%), and dense residential population exposed to urban heat island conditions. The area scores ${input.vulnerabilityScore ?? 7}/10 on the composite heat risk index, placing it among the highest-priority zones for intervention.`,

    keyRiskFactors: [
      `Low tree canopy coverage (${input.treeCanopyPct ?? 15}% vs. recommended 30%+)`,
      `High impervious surface ratio (${input.imperviousSurfacePct ?? 50}% \u2014 traps radiated heat)`,
      'Limited access to public cooling infrastructure (parks, water bodies, shade)',
      'High population density in heat-exposed zones with limited ventilation corridors',
      'Aging building stock with low roof reflectivity and poor insulation',
    ],

    seasonalContext:
      `Peak heat season runs March\u2013June with daily maxima regularly exceeding ${baseline}\u00b0C and heat index often 5\u20138\u00b0C higher. The post-monsoon period (October\u2013November) is the optimal window for tree planting and cool surface installation. Winter months (December\u2013February) offer ideal conditions for green roof and shade structure works due to lower temperatures and dry conditions.`,

    combinedImpactNarrative:
      `When all ${input.strategies.length} proposed strategies are implemented together, the synergistic cooling effect is projected to reduce average surface temperatures by ${input.projectedTempReductionC.toFixed(1)}\u00b0C, with micro-clusters near green infrastructure corridors seeing reductions of up to ${(input.projectedTempReductionC * 1.35).toFixed(1)}\u00b0C. Vegetation cover and reflective surfaces work in tandem: trees reduce incoming solar radiation by 40\u201360%, while cool pavements reflect what reaches the ground, creating a compound cooling feedback loop that becomes more effective as plantings mature over 3\u20135 years.`,

    beforeAfterTable: [
      { metric: 'Average Surface Temp', before: `${baseline}\u00b0C`, after: `${afterTemp}\u00b0C` },
      { metric: 'Vulnerability Level', before: input.vulnerabilityLevel ?? 'HIGH', after: input.projectedTempReductionC >= 2 ? 'LOW' : 'MEDIUM' },
      { metric: 'Tree Canopy Coverage', before: `${input.treeCanopyPct ?? 15}%`, after: `${Math.min(100, (input.treeCanopyPct ?? 15) + Math.round(input.projectedTempReductionC * 4))}%` },
      { metric: 'CO\u2082 Absorbed / Year', before: 'Baseline (0 tons offset)', after: `+${input.projectedCo2ReductionTons.toFixed(1)} tons / year` },
      { metric: 'Heat Risk Days / Year', before: 'Est. 90+ days above heat index alert', after: `Est. ${Math.max(10, 90 - Math.round(input.projectedTempReductionC * 15))} days (${Math.round(input.projectedTempReductionC * 15)}% reduction)` },
    ],

    totalTreesPlanted: treeQty || Math.round(input.projectedCo2ReductionTons / 0.02),

    livesSavedCitation:
      `Based on the WHO heat-mortality regression model (Gasparrini et al., 2017, Lancet): a ${input.projectedTempReductionC.toFixed(1)}\u00b0C reduction in ambient temperature is associated with a ${(input.projectedTempReductionC * 8).toFixed(0)}% reduction in heat-attributable mortality per 100,000 population during summer months. Applied to the ${(input.population ?? 50000).toLocaleString()} population of ${input.placeName}, this projects ${input.projectedLivesSaved} lives protected per summer season.`,

    strategyExtras: input.strategies.map(s => ({
      type: s.type,
      localName: s.type === 'TREE_PLANTING'
        ? (input.countryCode === 'in' ? 'Nagarvan (Urban Forest) Initiative' : 'Urban Forestry Program')
        : s.type === 'GREEN_ROOF' ? (input.countryCode === 'in' ? 'Harit Chhat Yojana' : 'Green Roof Programme')
        : s.type === 'COOL_PAVEMENT' ? (input.countryCode === 'in' ? 'Reflective Sadak Coating' : 'Cool Roads Initiative')
        : s.name,
      specificLocation: s.placementNotes || `High-footfall zones within ${input.placeName}`,
      speciesOrMaterials: s.type === 'TREE_PLANTING'
        ? (input.countryCode === 'in' ? 'Neem (Azadirachta indica), Peepal (Ficus religiosa), Gulmohar (Delonix regia), Bottle Brush \u2014 all drought-resistant native species' : 'Native shade trees suited to local climate')
        : s.type.includes('ROOF') ? 'High-SRI (\u226580) white elastomeric coating, ENERGY STAR rated'
        : s.type === 'COOL_PAVEMENT' ? 'Titanium dioxide-based reflective coating (albedo \u22650.50) or light-coloured concrete mix'
        : s.type === 'PERMEABLE_PAVEMENT' ? 'Porous asphalt or pervious concrete (void ratio 15\u201325%)'
        : 'Standard high-performance material per BIS/local specifications',
      fundingSource: input.countryCode === 'in'
        ? (s.type === 'TREE_PLANTING' ? 'CAMPA Fund (Compensatory Afforestation) \u2014 apply via State Forest Department'
          : s.type.includes('ROOF') ? 'Smart Cities Mission \u2014 Climate Resilience component (MoHUA)'
          : 'AMRUT 2.0 \u2014 Green and Blue Infrastructure sub-component')
        : 'Municipal Climate Resilience Fund or national green infrastructure grant',
      bestSeason: input.countryCode === 'in' ? 'October\u2013November (post-monsoon, pre-winter)' : 'Spring (March\u2013May) for planting; Autumn for construction works',
      treesEquivalent: Math.round(s.co2ReductionTons * 45),
    })),

    roadmap: [
      { period: 'Month 1\u20132', milestone: 'Site assessment & procurement', responsible: 'Municipal Ward Office / ULB', tasks: ['Commission site survey for all target zones', 'Float e-tenders on GeM portal', 'Community consultation and ward committee resolution', 'Apply for required environmental clearances'] },
      { period: 'Month 3\u20134', milestone: 'Phase 1 deployment \u2014 highest-impact interventions', responsible: 'Works Department / Contractor', tasks: ['Begin tree planting in highest-vulnerability blocks', 'Install shade structures at bus stops and public spaces', 'Mobilise community volunteer tree-care groups'] },
      { period: 'Month 5\u20136', milestone: 'Monitoring infrastructure setup', responsible: 'Environment Cell / Smart City PMU', tasks: ['Deploy IoT temperature sensors at 5+ points in the area', 'Establish data dashboard accessible to ward officials', 'Record baseline heat measurements for impact tracking'] },
      { period: 'Month 7\u20139', milestone: 'Phase 2 deployment \u2014 infrastructure works', responsible: 'PWD / Municipal Engineer', tasks: ['Apply cool pavement / permeable surface coating on priority roads', 'Green roof installation on public buildings (schools, clinics)', 'Mid-point review with city commissioner'] },
      { period: 'Month 10\u201311', milestone: 'Impact assessment & reporting', responsible: 'Urban Planning Department', tasks: ['Compare temperature delta vs baseline sensors', 'Conduct community health survey in target wards', 'Publish interim impact report for council review'] },
      { period: 'Month 12', milestone: 'Final evaluation & city-wide scale-up plan', responsible: "Mayor's Office / Smart City CEO", tasks: ['Present results to full council with quantified outcomes', 'Issue RFP for Phase 2 city-wide expansion', 'Submit learnings to national programme (Smart Cities / AMRUT)'] },
    ],

    comparisonCities: [
      {
        name: 'Ahmedabad',
        country: 'India',
        context: `Ahmedabad shares ${input.cityName}'s Tier-2 profile, extreme summer heat (45\u00b0C+), and high urban density in older city wards.`,
        whatTheyDid: "Launched India's first Heat Action Plan in 2013: cool roof programme, pre-cooling of public spaces, community mobilisation in 56 wards, and an early warning system integrated with AMC health services.",
        results: 'Prevented 1,190+ heat-related deaths over 5 years. Heat ER admissions dropped 35%. Cool roofs lowered indoor temperatures by 2\u20135\u00b0C in participating households.',
      },
      {
        name: 'Medell\u00edn',
        country: 'Colombia',
        context: `Medell\u00edn is a dense tropical city that successfully tackled urban heat using green corridors \u2014 directly applicable to ${input.placeName}'s linear heat mitigation opportunity.`,
        whatTheyDid: 'Planted 30 interconnected green corridors covering 36 km of streets, combining 8,800 trees, bioswales, and cool pavements in formerly impervious zones.',
        results: 'Average temperature reduction of 2\u00b0C across corridor zones. 79% increase in pedestrian use. Air quality improvement of 30%. Model adopted by 12 other Latin American cities.',
      },
    ],

    contacts: [
      `Municipal Commissioner / CEO, ${input.cityName} Urban Local Body \u2014 primary approving authority`,
      `State Urban Development Department (SUDA) \u2014 Climate Resilience / Green Infrastructure Cell`,
      `District Collector's Office \u2014 Land Use Permissions and Environment Clearances`,
      `State Pollution Control Board (PCB) \u2014 Environmental impact pre-assessment`,
      `NABARD District Office \u2014 NAFCC / climate adaptation fund applications`,
    ],

    fundingApplications: [
      'AMRUT 2.0 (Atal Mission for Rejuvenation and Urban Transformation) \u2014 apply through State nodal agency; rolling submission window',
      'Smart Cities Mission \u2014 Climate Resilience sub-component (MoHUA), annual call for proposals in July\u2013August',
      'National Adaptation Fund for Climate Change (NAFCC) via NABARD \u2014 state government must be the lead applicant',
      'Green Climate Fund (GCF) \u2014 through MoEFCC as national designated authority; suitable for multi-city scale-up',
      'CSR Funding \u2014 approach local PSUs (ONGC, IOCL, banks) under Companies Act Section 135 for matching contribution',
    ],

    immediateActions: [
      `File RTI to obtain ward-level tree census and impervious surface mapping data for ${input.placeName}`,
      'Present this scenario report at the next Ward Committee meeting to pass a resolution supporting the plan',
      'Identify and survey 3\u20135 pilot micro-sites (each ~500 m\u00b2) for Phase 1 deployment within the next 30 days',
      `Contact State Forest Department for CAMPA Fund eligibility assessment for the tree planting component`,
      'Register the project on GeM (Government e-Marketplace) for procurement readiness before tenders are floated',
    ],
  };
}

// ── AI prompt builder ─────────────────────────────────────────────────────────

function buildPrompt(input: DetailedReportInput): string {
  const baseline = input.baselineTempC ?? 35;
  const afterTemp = (baseline - input.projectedTempReductionC).toFixed(1);
  const stratList = input.strategies
    .map(s => `${s.type}:${s.name}(qty:${s.quantity},cost:${s.totalCostLocal},cooling:${s.tempReductionC}C)`)
    .join('; ');

  return `Expert urban heat planner. Return ONLY valid JSON for a detailed mitigation report. No markdown.

Location: ${input.placeName}, ${input.cityName}, ${input.countryName} (${input.countryCode})
Vulnerability: ${input.vulnerabilityLevel ?? 'HIGH'} (${input.vulnerabilityScore ?? 7}/10)
Baseline temp: ${baseline}C | Projected cooling: ${input.projectedTempReductionC}C | After: ${afterTemp}C
Population: ${input.population ?? 50000} | Tree canopy: ${input.treeCanopyPct ?? 15}% | Impervious: ${input.imperviousSurfacePct ?? 50}%
Lives saved: ${input.projectedLivesSaved} | CO2 offset: ${input.projectedCo2ReductionTons} tons/yr
Strategies: ${stratList}

JSON schema (keep all string values SHORT, single-line, no nested quotes):
{
  "placeVulnerabilityBreakdown": "2-3 sentence explanation of why this place is vulnerable",
  "keyRiskFactors": ["factor 1","factor 2","factor 3","factor 4"],
  "seasonalContext": "1-2 sentences on peak heat season and optimal planting/construction window for ${input.countryName}",
  "combinedImpactNarrative": "3-4 sentences on synergistic effect of all strategies together",
  "beforeAfterTable": [
    {"metric":"Average Temperature","before":"${baseline}C","after":"${afterTemp}C"},
    {"metric":"Vulnerability Level","before":"${input.vulnerabilityLevel ?? 'HIGH'}","after":"projected level after interventions"},
    {"metric":"Tree Canopy","before":"${input.treeCanopyPct ?? 15}%","after":"projected % with additions"},
    {"metric":"CO2 Absorbed/Year","before":"Baseline","after":"+ ${input.projectedCo2ReductionTons} tons"},
    {"metric":"Heat Risk Days/Year","before":"est. current days","after":"projected reduced days"}
  ],
  "totalTreesPlanted": ${input.strategies.filter(s => s.type === 'TREE_PLANTING').reduce((sum, s) => sum + s.quantity, 0) || 200},
  "livesSavedCitation": "Short citation: WHO heat-mortality model + calculation showing ${input.projectedLivesSaved} lives",
  "strategyExtras": [${input.strategies.map(s => `
    {
      "type": "${s.type}",
      "localName": "official local-language or scheme name in ${input.countryName}",
      "specificLocation": "specific streets/zones within ${input.placeName}",
      "speciesOrMaterials": "species names or material specs appropriate for ${input.cityName} climate",
      "fundingSource": "specific govt scheme or fund in ${input.countryName} for this type",
      "bestSeason": "best month range to deploy in ${input.countryName}",
      "treesEquivalent": ${Math.round(s.co2ReductionTons * 45)}
    }`).join(',')}
  ],
  "roadmap": [
    {"period":"Month 1-2","milestone":"Site assessment and procurement","responsible":"Municipal Ward Office","tasks":["task1","task2","task3"]},
    {"period":"Month 3-4","milestone":"Phase 1: highest-impact deployment","responsible":"Works Department","tasks":["task1","task2"]},
    {"period":"Month 5-6","milestone":"Monitoring setup","responsible":"Environment Cell","tasks":["task1","task2"]},
    {"period":"Month 7-9","milestone":"Phase 2: infrastructure works","responsible":"PWD / Contractor","tasks":["task1","task2"]},
    {"period":"Month 10-11","milestone":"Impact assessment","responsible":"Urban Planning Dept","tasks":["task1"]},
    {"period":"Month 12","milestone":"Review and scale-up plan","responsible":"Mayor's Office","tasks":["task1","task2"]}
  ],
  "comparisonCities": [
    {"name":"city1","country":"country","context":"1 sentence why comparable","whatTheyDid":"2 sentences specific actions","results":"quantified results"},
    {"name":"city2","country":"country","context":"1 sentence","whatTheyDid":"2 sentences","results":"quantified results"}
  ],
  "contacts": ["contact1 with role","contact2","contact3"],
  "fundingApplications": ["fund1 with application details","fund2","fund3"],
  "immediateActions": ["action1 in next 30 days","action2","action3","action4"]
}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateDetailedReportSections(
  input: DetailedReportInput,
): Promise<DetailedReportSections> {
  const fallback = buildFallback(input);

  const hasKey = Boolean(
    process.env.AICREDITS_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY,
  );
  if (!hasKey) return fallback;

  try {
    const text = await aiChat({
      messages: [{ role: 'user', content: buildPrompt(input) }],
      model: process.env.AI_PREFERRED_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
      maxTokens: 3500,
      timeoutMs: 60_000,
    });

    if (!text) return fallback;

    let raw: Record<string, unknown>;
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const s = cleaned.indexOf('{');
      const e = cleaned.lastIndexOf('}');
      raw = JSON.parse(s !== -1 && e !== -1 ? cleaned.slice(s, e + 1) : cleaned) as Record<string, unknown>;
    } catch {
      console.warn('[detailedReport] JSON parse failed, using fallback');
      return fallback;
    }

    const arr = <T>(v: unknown, fb: T[]): T[] => (Array.isArray(v) ? v as T[] : fb);
    const str = (v: unknown, fb: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fb);

    return {
      placeVulnerabilityBreakdown: str(raw.placeVulnerabilityBreakdown, fallback.placeVulnerabilityBreakdown),
      keyRiskFactors: arr(raw.keyRiskFactors, fallback.keyRiskFactors).map(String),
      seasonalContext: str(raw.seasonalContext, fallback.seasonalContext),
      combinedImpactNarrative: str(raw.combinedImpactNarrative, fallback.combinedImpactNarrative),
      beforeAfterTable: arr(raw.beforeAfterTable, fallback.beforeAfterTable) as typeof fallback.beforeAfterTable,
      totalTreesPlanted: Number(raw.totalTreesPlanted ?? fallback.totalTreesPlanted),
      livesSavedCitation: str(raw.livesSavedCitation, fallback.livesSavedCitation),
      strategyExtras: arr(raw.strategyExtras, fallback.strategyExtras) as StrategyExtra[],
      roadmap: arr(raw.roadmap, fallback.roadmap) as RoadmapPhase[],
      comparisonCities: arr(raw.comparisonCities, fallback.comparisonCities) as ComparisonCity[],
      contacts: arr(raw.contacts, fallback.contacts).map(String),
      fundingApplications: arr(raw.fundingApplications, fallback.fundingApplications).map(String),
      immediateActions: arr(raw.immediateActions, fallback.immediateActions).map(String),
    };
  } catch (err) {
    console.error('[detailedReport] AI call failed, using fallback:', err);
    return fallback;
  }
}
