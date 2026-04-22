#!/usr/bin/env node
import 'dotenv/config';
import { generateScenarios } from '../src/lib/ai/scenarioGeneration';

async function main() {
  try {
    const input = {
      placeName: 'Test Locality',
      cityName: 'Pune',
      stateName: 'Maharashtra',
      countryName: 'India',
      countryCode: 'in',
      latitude: 18.5204,
      longitude: 73.8567,
      population: 100000,
      baselineTempC: 35,
      treeCanopyPct: 12,
      imperviousSurfacePct: 55,
      vulnerabilityScore: 4,
      vulnerabilityLevel: 'HIGH',
      selectedStrategies: ['TREE_PLANTING', 'COOL_PAVEMENT'],
      budgetLocal: 500000,
      timelineMonths: 12,
      priority: 'HEALTH',
    };

    console.log('Starting AI probe (this will use AICREDITS/OPENAI/OPENROUTER keys from environment)...');
    const res = await generateScenarios(input as any);
    console.log('AI probe result:', JSON.stringify(res, null, 2).slice(0, 4000));
  } catch (err) {
    console.error('Error generating scenarios:', err);
    process.exitCode = 2;
  }
}

main();
