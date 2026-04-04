import { NextResponse } from 'next/server';
import { SimulationEngine } from '@/lib/simulation/engine';
import { cityZones, interventions } from '@/lib/data/seed';

export async function GET() {
  const engine = new SimulationEngine();
  const results = cityZones.map((zone) => {
    const zoneInterventionIds = interventions
      .filter((i) => i.zoneId === zone.id)
      .map((i) => i.id);
    const simulation = engine.runSimulation(zone.id, zoneInterventionIds);
    const health = engine.estimateHealthImpact(
      simulation.tempReduction,
      zone.populationDensity * 100
    );
    const zoneInterventions = interventions.filter((i) => i.zoneId === zone.id);
    const cost = engine.estimateCostBenefit(zoneInterventions, health);
    return { zone: zone.name, ...simulation, health, cost };
  });
  return NextResponse.json({ simulations: results });
}
