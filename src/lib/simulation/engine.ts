// Temperature Reduction Simulation Engine
// Based on EPA/NOAA Urban Heat Island Reduction Research

import { type CityZone, type Intervention, cityZones, interventions } from '../data/seed';

export interface SimulationResult {
  zoneId: string;
  zoneName: string;
  baselineTemp: number;
  projectedTemp: number;
  tempReduction: number;
  confidenceInterval: [number, number];
  interventionsApplied: string[];
}

export interface HealthImpactResult {
  excessDeathsPrevented: number;
  hospitalizationsPrevented: number;
  qualityAdjustedLifeYears: number;
}

export interface CostBenefitResult {
  totalCost: number;
  totalBenefit: number;
  roi: number;
  costPerDeathPrevented: number;
  costPerDegreeReduction: number;
  paybackYears: number;
}

// EPA-based reduction coefficients
const REDUCTION_COEFFICIENTS = {
  tree: 0.1,           // -1°C per 10% canopy increase
  green_roof: 0.06,    // -0.3°C per 5% roof coverage
  cool_pavement: 0.025,// -0.5°C per 20% pavement coverage
  mist_station: 0.05,  // -0.05°C per station per zone
  park: 0.08,          // -0.8°C per 10,000 sqm park
  white_roof: 0.04,    // -0.2°C per 5% roof coverage
};

const UNCERTAINTY_FACTOR = 0.25; // 25% uncertainty band

export class SimulationEngine {
  runSimulation(zoneId: string, interventionIds: string[]): SimulationResult {
    const zone = cityZones.find(z => z.id === zoneId);
    if (!zone) throw new Error(`Zone ${zoneId} not found`);

    const zoneInterventions = interventionIds
      .map(id => interventions.find(i => i.id === id))
      .filter((i): i is Intervention => i !== undefined && i.zoneId === zoneId);

    let totalReduction = 0;
    for (const intervention of zoneInterventions) {
      totalReduction += this.calculateReduction(intervention, zone);
    }

    const ci: [number, number] = [
      totalReduction * (1 - UNCERTAINTY_FACTOR),
      totalReduction * (1 + UNCERTAINTY_FACTOR),
    ];

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      baselineTemp: zone.avgTemp,
      projectedTemp: zone.avgTemp - totalReduction,
      tempReduction: totalReduction,
      confidenceInterval: ci,
      interventionsApplied: zoneInterventions.map(i => i.id),
    };
  }

  private calculateReduction(intervention: Intervention, zone: CityZone): number {
    const coeff = REDUCTION_COEFFICIENTS[intervention.type];
    switch (intervention.type) {
      case 'tree': {
        const trees = (intervention.parameters.trees as number) || 0;
        const canopyIncrease = (trees * 50) / (zone.populationDensity * 10); // rough area calc
        return canopyIncrease * coeff * 10;
      }
      case 'green_roof': {
        const units = (intervention.parameters.units as number) || 0;
        const avgArea = (intervention.parameters.avgArea as number) || 200;
        const coveragePct = (units * avgArea) / (zone.populationDensity * 100) * 100;
        return coveragePct * coeff;
      }
      case 'cool_pavement': {
        const area = (intervention.parameters.areaSqM as number) || 0;
        const coveragePct = area / (zone.populationDensity * 100) * 100;
        return coveragePct * coeff;
      }
      case 'mist_station': {
        const stations = (intervention.parameters.stations as number) || 0;
        return stations * coeff;
      }
      case 'park': {
        const parkArea = (intervention.parameters.areaSqM as number) || 0;
        return (parkArea / 10000) * coeff * 10;
      }
      default:
        return intervention.tempReduction;
    }
  }

  estimateHealthImpact(tempReduction: number, population: number): HealthImpactResult {
    // Based on CDC research: ~1.5 excess deaths per 100k population per 1°C above threshold
    const deathRate = 1.5 / 100000;
    const excessDeathsPrevented = Math.round(tempReduction * deathRate * population * 120); // summer days
    const hospitalizationsPrevented = excessDeathsPrevented * 8; // 8:1 ratio
    const qualityAdjustedLifeYears = excessDeathsPrevented * 12; // avg 12 QALY per death prevented

    return { excessDeathsPrevented, hospitalizationsPrevented, qualityAdjustedLifeYears };
  }

  estimateCostBenefit(
    interventionList: Intervention[],
    healthImpact: HealthImpactResult
  ): CostBenefitResult {
    const totalCost = interventionList.reduce((sum, i) => sum + i.estimatedCostUsd, 0);
    // EPA values statistical life at ~$11.6M (2024)
    const valuePerLife = 11600000;
    const valuePerHospitalization = 45000;
    const totalBenefit =
      healthImpact.excessDeathsPrevented * valuePerLife +
      healthImpact.hospitalizationsPrevented * valuePerHospitalization;

    const totalReduction = interventionList.reduce((sum, i) => sum + i.tempReduction, 0);

    return {
      totalCost,
      totalBenefit,
      roi: totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0,
      costPerDeathPrevented: healthImpact.excessDeathsPrevented > 0
        ? totalCost / healthImpact.excessDeathsPrevented : 0,
      costPerDegreeReduction: totalReduction > 0 ? totalCost / totalReduction : 0,
      paybackYears: totalBenefit > 0 ? totalCost / (totalBenefit / 20) : 0, // 20-year horizon
    };
  }
}

export const simulationEngine = new SimulationEngine();
