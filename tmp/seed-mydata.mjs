/**
 * Targeted seed: adds 5 sample places (with heat measurements + interventions)
 * to the FIRST city found in the database.
 * Safe to run on an existing DB — does NOT wipe any data.
 * Run from urban-heat-mitigator/:  node tmp/seed-mydata.mjs
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PLACES = [
  {
    name: 'Eastern Industrial Zone',
    population: 32000, areaSqkm: 7.8, medianIncome: 28000,
    pctElderly: 11, pctChildren: 24,
    vulnerabilityScore: 92, vulnerabilityLevel: 'CRITICAL',
    measurements: [
      { daysAgo: 7,  avg: 45.1, max: 47.8, min: 41.3, canopy: 4,  imperv: 88 },
      { daysAgo: 37, avg: 44.6, max: 47.2, min: 40.8, canopy: 4,  imperv: 88 },
      { daysAgo: 67, avg: 43.2, max: 45.8, min: 39.4, canopy: 5,  imperv: 87 },
      { daysAgo: 97, avg: 41.9, max: 44.5, min: 38.1, canopy: 5,  imperv: 87 },
    ],
    interventions: [
      { name: 'Industrial Zone Tree Belt', type: 'TREE_PLANTING', status: 'IN_PROGRESS', cost: 185000, tempReduction: 0.9 },
      { name: 'Cool Pavement Pilot',       type: 'COOL_PAVEMENT', status: 'APPROVED',    cost: 220000, tempReduction: 0.6 },
    ],
  },
  {
    name: 'South Market District',
    population: 27500, areaSqkm: 5.1, medianIncome: 33000,
    pctElderly: 13, pctChildren: 22,
    vulnerabilityScore: 84, vulnerabilityLevel: 'CRITICAL',
    measurements: [
      { daysAgo: 7,  avg: 44.4, max: 47.1, min: 40.9, canopy: 6,  imperv: 85 },
      { daysAgo: 37, avg: 43.9, max: 46.6, min: 40.4, canopy: 6,  imperv: 85 },
      { daysAgo: 67, avg: 42.6, max: 45.3, min: 39.1, canopy: 7,  imperv: 84 },
    ],
    interventions: [
      { name: 'Market District Cool Roof Drive', type: 'COOL_ROOF',     status: 'APPROVED',  cost: 175000, tempReduction: 0.5 },
      { name: 'South Market Urban Garden',       type: 'URBAN_GARDEN',  status: 'PROPOSED',  cost: 95000,  tempReduction: 0.4 },
    ],
  },
  {
    name: 'Central Business District',
    population: 18500, areaSqkm: 4.2, medianIncome: 68000,
    pctElderly: 8, pctChildren: 6,
    vulnerabilityScore: 71, vulnerabilityLevel: 'HIGH',
    measurements: [
      { daysAgo: 7,  avg: 43.2, max: 46.1, min: 39.8, canopy: 12, imperv: 76 },
      { daysAgo: 37, avg: 42.8, max: 45.7, min: 39.3, canopy: 12, imperv: 76 },
      { daysAgo: 67, avg: 41.5, max: 44.2, min: 38.0, canopy: 13, imperv: 75 },
    ],
    interventions: [
      { name: 'CBD Green Roof Initiative', type: 'GREEN_ROOF', status: 'APPROVED', cost: 420000, tempReduction: 0.5 },
    ],
  },
  {
    name: 'Northern Residential Quarter',
    population: 24000, areaSqkm: 5.9, medianIncome: 45000,
    pctElderly: 16, pctChildren: 19,
    vulnerabilityScore: 58, vulnerabilityLevel: 'MODERATE',
    measurements: [
      { daysAgo: 7,  avg: 41.3, max: 43.8, min: 37.9, canopy: 21, imperv: 62 },
      { daysAgo: 37, avg: 40.9, max: 43.4, min: 37.5, canopy: 21, imperv: 62 },
      { daysAgo: 67, avg: 39.6, max: 42.1, min: 36.2, canopy: 22, imperv: 61 },
    ],
    interventions: [
      { name: 'Residential Canopy Expansion', type: 'TREE_PLANTING', status: 'APPROVED', cost: 95000, tempReduction: 0.4 },
    ],
  },
  {
    name: 'Riverside Greenbelt',
    population: 11000, areaSqkm: 6.4, medianIncome: 54000,
    pctElderly: 9, pctChildren: 13,
    vulnerabilityScore: 28, vulnerabilityLevel: 'LOW',
    measurements: [
      { daysAgo: 7,  avg: 38.7, max: 41.2, min: 35.4, canopy: 34, imperv: 41 },
      { daysAgo: 37, avg: 38.2, max: 40.8, min: 35.0, canopy: 35, imperv: 40 },
      { daysAgo: 67, avg: 37.1, max: 39.6, min: 33.8, canopy: 35, imperv: 40 },
    ],
    interventions: [],
  },
];

async function main() {
  const city = await prisma.city.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!city) { console.error('No city found in database. Run the main seed first.'); process.exit(1); }

  const planner = await prisma.user.findFirst({
    where: { cityId: city.id, role: { in: ['URBAN_PLANNER', 'CITY_ADMIN'] } },
    orderBy: { createdAt: 'asc' },
  });

  const existingCount = await prisma.place.count({ where: { cityId: city.id } });
  console.log(`City: "${city.name}"  |  Existing places: ${existingCount}`);

  let created = 0;
  const now = new Date();

  for (const p of PLACES) {
    const exists = await prisma.place.findFirst({ where: { cityId: city.id, name: p.name } });
    if (exists) { console.log(`  skip  ${p.name} (already exists)`); continue; }

    const place = await prisma.place.create({
      data: {
        cityId: city.id,
        name: p.name,
        population: p.population,
        areaSqkm: p.areaSqkm,
        medianIncome: p.medianIncome,
        pctElderly: p.pctElderly,
        pctChildren: p.pctChildren,
        vulnerabilityScore: p.vulnerabilityScore,
        vulnerabilityLevel: p.vulnerabilityLevel,
      },
    });

    for (const m of p.measurements) {
      const d = new Date(now);
      d.setDate(d.getDate() - m.daysAgo);
      await prisma.heatMeasurement.create({
        data: {
          placeId: place.id,
          measurementDate: d,
          avgTempCelsius: m.avg,
          maxTempCelsius: m.max,
          minTempCelsius: m.min,
          treeCanopyPct: m.canopy,
          imperviousSurfacePct: m.imperv,
          dataSource: 'SAMPLE_DATA',
        },
      });
    }

    for (const i of p.interventions) {
      await prisma.intervention.create({
        data: {
          cityId: city.id,
          placeId: place.id,
          name: i.name,
          type: i.type,
          status: i.status,
          estimatedCostUsd: i.cost,
          estimatedTempReductionC: i.tempReduction,
          proposedById: planner?.id ?? undefined,
          approvedById: i.status === 'APPROVED' && planner ? planner.id : undefined,
          approvedAt: i.status === 'APPROVED' ? new Date() : undefined,
        },
      });
    }

    console.log(`  added  ${p.name} (${p.vulnerabilityLevel})`);
    created++;
  }

  console.log(`\nDone. Created ${created} new place(s) in "${city.name}".`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
