import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ── City: Austin, TX ──
  const city = await prisma.city.upsert({
    where: { slug: 'austin-tx' },
    update: {},
    create: {
      name: 'Austin, TX',
      slug: 'austin-tx',
      state: 'Texas',
      country: 'US',
      lat: 30.2672,
      lng: -97.7431,
    },
  });

  // ── Users ──
  const superAdminPw = await bcrypt.hash('Admin@HeatPlan2024!', 12);
  const userPw = await bcrypt.hash('User@HeatPlan2024!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@heatplan.io' },
    update: {},
    create: {
      email: 'admin@heatplan.io',
      name: 'Super Admin',
      passwordHash: superAdminPw,
      role: 'SUPER_ADMIN',
      cityId: city.id,
    },
  });

  const cityAdmin = await prisma.user.upsert({
    where: { email: 'mayor@austin.gov' },
    update: {},
    create: {
      email: 'mayor@austin.gov',
      name: 'Jane Martinez',
      passwordHash: userPw,
      role: 'CITY_ADMIN',
      cityId: city.id,
    },
  });

  const planner = await prisma.user.upsert({
    where: { email: 'planner@austin.gov' },
    update: {},
    create: {
      email: 'planner@austin.gov',
      name: 'David Chen',
      passwordHash: userPw,
      role: 'URBAN_PLANNER',
      cityId: city.id,
    },
  });

  const council = await prisma.user.upsert({
    where: { email: 'council@austin.gov' },
    update: {},
    create: {
      email: 'council@austin.gov',
      name: 'Sarah Wilson',
      passwordHash: userPw,
      role: 'CITY_COUNCIL',
      cityId: city.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'resident@austin.gov' },
    update: {},
    create: {
      email: 'resident@austin.gov',
      name: 'Mike Johnson',
      passwordHash: userPw,
      role: 'PUBLIC',
      cityId: city.id,
    },
  });

  // ── Onboarding ──
  await prisma.onboardingState.upsert({
    where: { cityId: city.id },
    update: { isComplete: true, step1City: true, step2Neighbors: true, step3Heat: true, step4Team: true, step5Alerts: true, step6Complete: true },
    create: { cityId: city.id, isComplete: true, step1City: true, step2Neighbors: true, step3Heat: true, step4Team: true, step5Alerts: true, step6Complete: true },
  });

  // ── Neighborhoods (Austin) ──
  const neighborhoodData = [
    { name: 'Downtown', population: 12500, areaSqkm: 3.2, medianIncome: 75000, pctElderly: 8, pctChildren: 5 },
    { name: 'East Riverside', population: 28000, areaSqkm: 5.8, medianIncome: 42000, pctElderly: 12, pctChildren: 22 },
    { name: 'Mueller', population: 15000, areaSqkm: 4.1, medianIncome: 85000, pctElderly: 6, pctChildren: 18 },
    { name: 'South Congress', population: 19000, areaSqkm: 3.5, medianIncome: 62000, pctElderly: 10, pctChildren: 12 },
    { name: 'Barton Hills', population: 8500, areaSqkm: 6.2, medianIncome: 95000, pctElderly: 15, pctChildren: 8 },
    { name: 'North Lamar', population: 32000, areaSqkm: 7.4, medianIncome: 38000, pctElderly: 18, pctChildren: 25 },
    { name: 'Zilker', population: 6200, areaSqkm: 4.8, medianIncome: 110000, pctElderly: 12, pctChildren: 10 },
    { name: 'Montopolis', population: 14000, areaSqkm: 5.1, medianIncome: 35000, pctElderly: 14, pctChildren: 28 },
    { name: 'Highland', population: 20000, areaSqkm: 4.5, medianIncome: 55000, pctElderly: 9, pctChildren: 15 },
    { name: 'St. Johns', population: 11000, areaSqkm: 3.8, medianIncome: 45000, pctElderly: 16, pctChildren: 20 },
  ];

  const neighborhoods = [];
  for (const nd of neighborhoodData) {
    const n = await prisma.neighborhood.upsert({
      where: { cityId_name: { cityId: city.id, name: nd.name } },
      update: nd,
      create: { cityId: city.id, ...nd },
    });
    neighborhoods.push(n);
  }

  // ── Heat Measurements ──
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
  const baseTempCurve = [10, 13, 18, 22, 27, 32, 35, 35, 31, 24, 16, 11]; // Austin average monthly °C

  for (const n of neighborhoods) {
    const heatIslandOffset = (Math.random() * 4) - 1;
    
    for (let m = 0; m < 12; m++) {
      const avg = baseTempCurve[m] + heatIslandOffset + (Math.random() - 0.5) * 2;
      const max = avg + 4 + Math.random() * 3;
      const min = avg - 3 - Math.random() * 2;

      await prisma.heatMeasurement.create({
        data: {
          neighborhoodId: n.id,
          measurementDate: new Date(`${months[m]}-15T12:00:00Z`),
          avgTempCelsius: Math.round(avg * 10) / 10,
          maxTempCelsius: Math.round(max * 10) / 10,
          minTempCelsius: Math.round(min * 10) / 10,
          dataSource: 'SEED_DATA',
        },
      });
    }
  }

  // ── Weather Stations ──
  const stations = [
    { name: 'Austin-Bergstrom Airport', stationCode: 'KAUS', latitude: 30.1975, longitude: -97.6664 },
    { name: 'Camp Mabry', stationCode: 'KATX', latitude: 30.3184, longitude: -97.7633 },
  ];
  
  for (const s of stations) {
    const station = await prisma.weatherStation.create({
      data: { cityId: city.id, ...s },
    });
    
    for (let m = 0; m < 12; m++) {
      await prisma.weatherReading.create({
        data: {
          stationId: station.id,
          recordedAt: new Date(`${months[m]}-15T12:00:00Z`),
          tempCelsius: baseTempCurve[m] + (Math.random() - 0.5) * 2,
          humidity: 50 + Math.random() * 30,
          windSpeed: 8 + Math.random() * 15,
        },
      });
    }
  }

  // ── Interventions ──
  const interventionData = [
    { name: 'Downtown Tree Corridor', type: 'TREE_PLANTING', neighborhoodIdx: 0, status: 'IN_PROGRESS', cost: 450000, reduction: 1.2 },
    { name: 'East Riverside Green Roofs', type: 'GREEN_ROOF', neighborhoodIdx: 1, status: 'APPROVED', cost: 1200000, reduction: 0.8 },
    { name: 'Mueller Park Expansion', type: 'URBAN_GARDEN', neighborhoodIdx: 2, status: 'COMPLETED', cost: 300000, reduction: 0.6 },
    { name: 'SoCo Cool Pavement Phase 1', type: 'COOL_PAVEMENT', neighborhoodIdx: 3, status: 'IN_PROGRESS', cost: 800000, reduction: 0.5 },
    { name: 'North Lamar Shade Trees', type: 'TREE_PLANTING', neighborhoodIdx: 5, status: 'PROPOSED', cost: 650000, reduction: 1.5 },
    { name: 'Montopolis Mist Stations', type: 'MIST_STATION', neighborhoodIdx: 7, status: 'APPROVED', cost: 75000, reduction: 0.3 },
  ];

  const interventions = [];
  for (const id of interventionData) {
    const intervention = await prisma.intervention.create({
      data: {
        cityId: city.id,
        neighborhoodId: neighborhoods[id.neighborhoodIdx].id,
        name: id.name,
        type: id.type,
        status: id.status,
        estimatedCostUsd: id.cost,
        estimatedTempReductionC: id.reduction,
        proposedById: planner.id,
      },
    });
    interventions.push(intervention);
  }

  // ── Scenarios ──
  const scenario1 = await prisma.scenario.create({
    data: {
      cityId: city.id,
      name: 'Conservative Tree Plan',
      description: 'Focus on high-density tree planting in the hottest neighborhoods with modest budget.',
      status: 'APPROVED',
      createdById: planner.id,
    },
  });

  const scenario2 = await prisma.scenario.create({
    data: {
      cityId: city.id,
      name: 'Aggressive Green Infrastructure',
      description: 'Maximum-impact plan combining green roofs, cool pavement, and urban gardens across all districts.',
      status: 'DRAFT',
      createdById: planner.id,
    },
  });

  const scenario3 = await prisma.scenario.create({
    data: {
      cityId: city.id,
      name: 'Equity-First Approach',
      description: 'Prioritize interventions in low-income, high-vulnerability neighborhoods.',
      status: 'SUBMITTED',
      createdById: cityAdmin.id,
    },
  });

  // Link interventions to scenarios
  await prisma.scenarioIntervention.createMany({
    data: [
      { scenarioId: scenario1.id, interventionId: interventions[0].id },
      { scenarioId: scenario1.id, interventionId: interventions[4].id },
      { scenarioId: scenario2.id, interventionId: interventions[0].id },
      { scenarioId: scenario2.id, interventionId: interventions[1].id },
      { scenarioId: scenario2.id, interventionId: interventions[3].id },
      { scenarioId: scenario3.id, interventionId: interventions[4].id },
      { scenarioId: scenario3.id, interventionId: interventions[5].id },
    ],
  });

  // ── Simulation Results ──
  await prisma.simulationResult.createMany({
    data: [
      { scenarioId: scenario1.id, outputSummary: JSON.stringify({ tempReduction: 1.4, livesSaved: 12, co2Offset: 450, costBenefit: 2.3 }), modelVersion: 'v1.0' },
      { scenarioId: scenario2.id, outputSummary: JSON.stringify({ tempReduction: 2.8, livesSaved: 28, co2Offset: 1200, costBenefit: 1.8 }), modelVersion: 'v1.0' },
      { scenarioId: scenario3.id, outputSummary: JSON.stringify({ tempReduction: 1.8, livesSaved: 18, co2Offset: 600, costBenefit: 3.1 }), modelVersion: 'v1.0' },
    ],
  });

  // ── Reports ──
  await prisma.report.createMany({
    data: [
      { cityId: city.id, title: 'Q3 2025 Impact Summary', type: 'MONTHLY_IMPACT', status: 'COMPLETED', generatedById: planner.id, content: 'Quarterly impact summary for Austin, TX heat mitigation program.' },
      { cityId: city.id, title: 'Equity Assessment 2025', type: 'EQUITY_VULNERABILITY', status: 'COMPLETED', generatedById: cityAdmin.id, content: 'Annual equity and vulnerability assessment covering all 10 neighborhoods.' },
      { cityId: city.id, title: 'Budget Analysis FY2025', type: 'BUDGET_ALLOCATION', status: 'GENERATING', generatedById: planner.id },
    ],
  });

  // ── Audit Log ──
  await prisma.auditLog.createMany({
    data: [
      { userId: superAdmin.id, action: 'SEED_DATABASE', resourceType: 'System', afterValue: 'Database seeded with Austin, TX data' },
      { userId: cityAdmin.id, action: 'APPROVE_SCENARIO', resourceType: 'Scenario', resourceId: scenario1.id, afterValue: 'Approved Conservative Tree Plan' },
      { userId: planner.id, action: 'CREATE_INTERVENTION', resourceType: 'Intervention', afterValue: 'Created 6 initial interventions' },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`   City: ${city.name}`);
  console.log(`   Users: 5 (admin@heatplan.io / Admin@HeatPlan2024!)`);
  console.log(`   Neighborhoods: ${neighborhoods.length}`);
  console.log(`   Interventions: ${interventions.length}`);
  console.log(`   Scenarios: 3`);
  console.log(`   Heat measurements: ${neighborhoods.length * 12}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
