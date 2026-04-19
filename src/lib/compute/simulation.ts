export interface SimulationInput {
  placeId: string;
  placeName: string;
  baselineTemp: number;
  treeCanopyPct: number;
  imperviousSurfacePct: number;
  population: number;
  interventions: InterventionInput[];
}

export interface InterventionInput {
  type: string;
  quantity: number;
  areaSqMeters?: number;
  costUsd: number;
}

export interface SimulationOutput {
  tempReductionCelsius: number;
  newAvgTempCelsius: number;
  newTreeCanopyPct: number;
  newImperviousSurfacePct: number;
  livesSavedAnnual: number;
  co2OffsetTonsPerYear: number;
  energySavingsKwhPerYear: number;
  costBenefitRatio: number;
  totalCost: number;
  interventionResults: InterventionResult[];
}

export interface InterventionResult {
  type: string;
  tempReductionCelsius: number;
  percentContribution: number;
}

const INTERVENTION_COEFFICIENTS: Record<string, {
  tempPerUnit: number;
  canopyPerUnit: number;
  imperviousReduction: number;
  co2PerUnit: number;
  energySavingsPerUnit: number;
}> = {
  TREE_PLANTING: {
    tempPerUnit: 0.008,
    canopyPerUnit: 0.02,
    imperviousReduction: 0.005,
    co2PerUnit: 0.022,
    energySavingsPerUnit: 45,
  },
  GREEN_ROOF: {
    tempPerUnit: 0.003,
    canopyPerUnit: 0.005,
    imperviousReduction: 0.01,
    co2PerUnit: 0.005,
    energySavingsPerUnit: 120,
  },
  COOL_PAVEMENT: {
    tempPerUnit: 0.0015,
    canopyPerUnit: 0,
    imperviousReduction: 0,
    co2PerUnit: 0,
    energySavingsPerUnit: 20,
  },
  COOL_ROOF: {
    tempPerUnit: 0.004,
    canopyPerUnit: 0,
    imperviousReduction: 0,
    co2PerUnit: 0,
    energySavingsPerUnit: 200,
  },
  PERMEABLE_PAVEMENT: {
    tempPerUnit: 0.001,
    canopyPerUnit: 0,
    imperviousReduction: 0.015,
    co2PerUnit: 0,
    energySavingsPerUnit: 10,
  },
  URBAN_GARDEN: {
    tempPerUnit: 0.006,
    canopyPerUnit: 0.01,
    imperviousReduction: 0.008,
    co2PerUnit: 0.01,
    energySavingsPerUnit: 30,
  },
  MIST_STATION: {
    tempPerUnit: 0.0005,
    canopyPerUnit: 0,
    imperviousReduction: 0,
    co2PerUnit: 0,
    energySavingsPerUnit: -50,
  },
};

function diminishingReturns(rawReduction: number, maxReduction: number): number {
  return maxReduction * (1 - Math.exp(-rawReduction / maxReduction));
}

export function runScenarioSimulation(input: SimulationInput): SimulationOutput {
  const maxTempReduction = 5.0;
  let totalRawReduction = 0;
  let totalCanopyGain = 0;
  let totalImperviousReduction = 0;
  let totalCo2 = 0;
  let totalEnergySavings = 0;
  let totalCost = 0;
  const interventionResults: InterventionResult[] = [];

  for (const intervention of input.interventions) {
    const coeff = INTERVENTION_COEFFICIENTS[intervention.type];
    if (!coeff) continue;

    const qty = intervention.quantity;
    const rawReduction = coeff.tempPerUnit * qty;
    totalRawReduction += rawReduction;
    totalCanopyGain += coeff.canopyPerUnit * qty;
    totalImperviousReduction += coeff.imperviousReduction * qty;
    totalCo2 += coeff.co2PerUnit * qty;
    totalEnergySavings += coeff.energySavingsPerUnit * qty;
    totalCost += intervention.costUsd;

    interventionResults.push({
      type: intervention.type,
      tempReductionCelsius: rawReduction,
      percentContribution: 0,
    });
  }

  const tempReduction = diminishingReturns(totalRawReduction, maxTempReduction);

  // Distribute actual reduction proportionally
  if (totalRawReduction > 0) {
    for (const r of interventionResults) {
      r.tempReductionCelsius = (r.tempReductionCelsius / totalRawReduction) * tempReduction;
      r.percentContribution = (r.tempReductionCelsius / tempReduction) * 100;
    }
  }

  const newAvgTemp = input.baselineTemp - tempReduction;
  const newTreeCanopy = Math.min(input.treeCanopyPct + totalCanopyGain, 80);
  const newImpervious = Math.max(input.imperviousSurfacePct - totalImperviousReduction, 5);

  // WHO heat mortality model: ~1.5% increase in mortality per 1°C above 20°C baseline
  const baselineExcessDeaths = Math.max(0, input.baselineTemp - 20) * 0.015 * (input.population / 100000);
  const newExcessDeaths = Math.max(0, newAvgTemp - 20) * 0.015 * (input.population / 100000);
  const livesSaved = Math.max(0, baselineExcessDeaths - newExcessDeaths);

  // Cost-benefit: value of statistical life year = $50,000, energy = $0.12/kWh
  const benefitDollars = livesSaved * 50000 + totalEnergySavings * 0.12 + totalCo2 * 50;
  const costBenefitRatio = totalCost > 0 ? benefitDollars / totalCost : 0;

  return {
    tempReductionCelsius: Math.round(tempReduction * 100) / 100,
    newAvgTempCelsius: Math.round(newAvgTemp * 100) / 100,
    newTreeCanopyPct: Math.round(newTreeCanopy * 100) / 100,
    newImperviousSurfacePct: Math.round(newImpervious * 100) / 100,
    livesSavedAnnual: Math.round(livesSaved * 10) / 10,
    co2OffsetTonsPerYear: Math.round(totalCo2 * 10) / 10,
    energySavingsKwhPerYear: Math.round(totalEnergySavings),
    costBenefitRatio: Math.round(costBenefitRatio * 100) / 100,
    totalCost,
    interventionResults,
  };
}
