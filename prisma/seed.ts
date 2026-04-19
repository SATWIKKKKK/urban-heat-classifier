import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedNeighborhood = {
  name: string;
  population: number;
  areaSqkm: number;
  medianIncome: number;
  pctElderly: number;
  pctChildren: number;
  avgTempCelsius: number;
  maxTempCelsius: number;
  minTempCelsius: number;
  treeCanopyPct: number;
  imperviousSurfacePct: number;
};

type SeedIntervention = {
  key: string;
  name: string;
  neighborhoodName: string;
  type: string;
  status: string;
  estimatedCostUsd: number;
  estimatedTempReductionC: number;
  location: string;
};

type SeedScenario = {
  name: string;
  description: string;
  status: string;
  priority: string;
  totalEstimatedCostUsd: number;
  totalProjectedTempReductionC: number;
  totalProjectedLivesSaved: number;
  projectedCo2ReductionTons: number;
  interventionKeys: string[];
  revisionNotes?: string;
  councilNotes?: string;
};

type SeedCity = {
  name: string;
  slug: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
  admin: { email: string; name: string };
  planner: { email: string; name: string };
  council: { email: string; name: string };
  neighborhoods: SeedNeighborhood[];
  interventions: SeedIntervention[];
  scenarios: SeedScenario[];
  reports: Array<{ title: string; type: string; status: string; tone: string; content: string }>;
};

const cities: SeedCity[] = [
  {
    name: 'Austin, TX',
    slug: 'austin-tx',
    state: 'Texas',
    country: 'United States',
    lat: 30.2672,
    lng: -97.7431,
    admin: { email: 'mayor@austin.gov', name: 'Jane Martinez' },
    planner: { email: 'planner@austin.gov', name: 'David Chen' },
    council: { email: 'council@austin.gov', name: 'Sarah Wilson' },
    neighborhoods: [
      { name: 'Rundberg', population: 28000, areaSqkm: 7.8, medianIncome: 31000, pctElderly: 16, pctChildren: 28, avgTempCelsius: 41.8, maxTempCelsius: 44.2, minTempCelsius: 38.1, treeCanopyPct: 9, imperviousSurfacePct: 78 },
      { name: 'Rosewood', population: 18000, areaSqkm: 4.7, medianIncome: 42000, pctElderly: 12, pctChildren: 21, avgTempCelsius: 41.2, maxTempCelsius: 43.7, minTempCelsius: 37.8, treeCanopyPct: 14, imperviousSurfacePct: 70 },
      { name: 'North Loop', population: 14500, areaSqkm: 3.9, medianIncome: 47000, pctElderly: 9, pctChildren: 17, avgTempCelsius: 40.8, maxTempCelsius: 43.0, minTempCelsius: 37.2, treeCanopyPct: 16, imperviousSurfacePct: 64 },
      { name: 'Downtown', population: 12500, areaSqkm: 3.2, medianIncome: 75000, pctElderly: 8, pctChildren: 5, avgTempCelsius: 39.9, maxTempCelsius: 42.1, minTempCelsius: 36.5, treeCanopyPct: 18, imperviousSurfacePct: 68 },
    ],
    interventions: [
      { key: 'rundberg-trees', name: 'Rundberg Tree Planting', neighborhoodName: 'Rundberg', type: 'TREE_PLANTING', status: 'APPROVED', estimatedCostUsd: 120000, estimatedTempReductionC: 0.8, location: '30.355,-97.707' },
      { key: 'rosewood-roofs', name: 'East Austin Green Roofs', neighborhoodName: 'Rosewood', type: 'GREEN_ROOF', status: 'APPROVED', estimatedCostUsd: 750000, estimatedTempReductionC: 0.6, location: '30.279,-97.700' },
      { key: 'northloop-white-roofs', name: 'North Loop White Roofs', neighborhoodName: 'North Loop', type: 'COOL_ROOF', status: 'APPROVED', estimatedCostUsd: 375000, estimatedTempReductionC: 0.4, location: '30.318,-97.722' },
      { key: 'rundberg-active-trees', name: 'Tree Planting Ph.1', neighborhoodName: 'Rundberg', type: 'TREE_PLANTING', status: 'IN_PROGRESS', estimatedCostUsd: 90000, estimatedTempReductionC: 0.6, location: '30.357,-97.709' },
    ],
    scenarios: [
      {
        name: 'Summer 2025 Emergency Cooling Plan',
        description: 'Focuses on the two CRITICAL neighborhoods with the strongest cost-per-degree options first.',
        status: 'APPROVED',
        priority: 'IMMEDIATE',
        totalEstimatedCostUsd: 1245000,
        totalProjectedTempReductionC: 1.8,
        totalProjectedLivesSaved: 23,
        projectedCo2ReductionTons: 12.4,
        interventionKeys: ['rundberg-trees', 'rosewood-roofs', 'northloop-white-roofs'],
        councilNotes: 'Approved for immediate funding and phased rollout.',
      },
      {
        name: 'Shade Corridor Expansion',
        description: 'Submitted package extending tree canopy into high-traffic corridors.',
        status: 'SUBMITTED',
        priority: 'SHORT_TERM',
        totalEstimatedCostUsd: 380000,
        totalProjectedTempReductionC: 0.9,
        totalProjectedLivesSaved: 8,
        projectedCo2ReductionTons: 5.1,
        interventionKeys: ['rundberg-active-trees'],
      },
    ],
    reports: [
      { title: 'Summer 2025 Heat Mitigation Impact Analysis', type: 'SCENARIO_IMPACT', status: 'COMPLETED', tone: 'ACCESSIBLE', content: 'Approving this $1.24M plan will protect an estimated 23 Austin residents from heat-related death every summer.' },
    ],
  },
  {
    name: 'Phoenix, AZ',
    slug: 'phoenix-az',
    state: 'Arizona',
    country: 'United States',
    lat: 33.4484,
    lng: -112.074,
    admin: { email: 'mayor@phoenix.gov', name: 'Miguel Ortega' },
    planner: { email: 'planner@phoenix.gov', name: 'Priya Shah' },
    council: { email: 'council@phoenix.gov', name: 'Helen Brooks' },
    neighborhoods: [
      { name: 'Maryvale', population: 24000, areaSqkm: 8.1, medianIncome: 36000, pctElderly: 11, pctChildren: 24, avgTempCelsius: 43.4, maxTempCelsius: 46.0, minTempCelsius: 39.1, treeCanopyPct: 7, imperviousSurfacePct: 81 },
      { name: 'Encanto', population: 19000, areaSqkm: 5.6, medianIncome: 51000, pctElderly: 13, pctChildren: 18, avgTempCelsius: 42.0, maxTempCelsius: 44.8, minTempCelsius: 38.0, treeCanopyPct: 12, imperviousSurfacePct: 74 },
      { name: 'Downtown Phoenix', population: 16500, areaSqkm: 4.1, medianIncome: 69000, pctElderly: 7, pctChildren: 9, avgTempCelsius: 41.1, maxTempCelsius: 44.0, minTempCelsius: 37.5, treeCanopyPct: 15, imperviousSurfacePct: 77 },
    ],
    interventions: [
      { key: 'maryvale-misters', name: 'Maryvale Mist Station Network', neighborhoodName: 'Maryvale', type: 'MIST_STATION', status: 'IN_PROGRESS', estimatedCostUsd: 140000, estimatedTempReductionC: 0.5, location: '33.492,-112.185' },
      { key: 'encanto-pavement', name: 'Encanto Cool Pavement Pilot', neighborhoodName: 'Encanto', type: 'COOL_PAVEMENT', status: 'PROPOSED', estimatedCostUsd: 410000, estimatedTempReductionC: 0.7, location: '33.474,-112.105' },
    ],
    scenarios: [
      {
        name: 'Desert Cooling Pilot',
        description: 'Pilot scenario for reflective materials and misting in the highest exposure zones.',
        status: 'DRAFT',
        priority: 'SHORT_TERM',
        totalEstimatedCostUsd: 550000,
        totalProjectedTempReductionC: 1.1,
        totalProjectedLivesSaved: 10,
        projectedCo2ReductionTons: 4.8,
        interventionKeys: ['maryvale-misters', 'encanto-pavement'],
      },
    ],
    reports: [
      { title: 'Phoenix Heat Resilience Snapshot', type: 'ANNUAL_PROGRESS', status: 'COMPLETED', tone: 'EXECUTIVE', content: 'Phoenix is piloting cooling interventions in the most heat-exposed districts.' },
    ],
  },
  {
    name: 'Houston, TX',
    slug: 'houston-tx',
    state: 'Texas',
    country: 'United States',
    lat: 29.7604,
    lng: -95.3698,
    admin: { email: 'mayor@houston.gov', name: 'Alicia Gomez' },
    planner: { email: 'planner@houston.gov', name: 'Marcus Lee' },
    council: { email: 'council@houston.gov', name: 'Eva Porter' },
    neighborhoods: [
      { name: 'Third Ward', population: 21000, areaSqkm: 6.3, medianIncome: 38000, pctElderly: 14, pctChildren: 22, avgTempCelsius: 40.6, maxTempCelsius: 43.4, minTempCelsius: 36.9, treeCanopyPct: 11, imperviousSurfacePct: 73 },
      { name: 'Greenspoint', population: 17500, areaSqkm: 5.5, medianIncome: 34000, pctElderly: 12, pctChildren: 26, avgTempCelsius: 41.0, maxTempCelsius: 43.8, minTempCelsius: 37.1, treeCanopyPct: 10, imperviousSurfacePct: 76 },
      { name: 'Midtown', population: 13200, areaSqkm: 3.6, medianIncome: 72000, pctElderly: 8, pctChildren: 8, avgTempCelsius: 39.8, maxTempCelsius: 42.5, minTempCelsius: 36.2, treeCanopyPct: 17, imperviousSurfacePct: 69 },
    ],
    interventions: [
      { key: 'third-ward-gardens', name: 'Third Ward Cooling Gardens', neighborhoodName: 'Third Ward', type: 'URBAN_GARDEN', status: 'APPROVED', estimatedCostUsd: 280000, estimatedTempReductionC: 0.6, location: '29.734,-95.357' },
      { key: 'greenspoint-trees', name: 'Greenspoint Shade Tree Program', neighborhoodName: 'Greenspoint', type: 'TREE_PLANTING', status: 'IN_PROGRESS', estimatedCostUsd: 195000, estimatedTempReductionC: 0.7, location: '29.940,-95.415' },
    ],
    scenarios: [
      {
        name: 'Equity-First Cooling Plan',
        description: 'Targets high-vulnerability neighborhoods first with shade and green space interventions.',
        status: 'APPROVED',
        priority: 'IMMEDIATE',
        totalEstimatedCostUsd: 475000,
        totalProjectedTempReductionC: 1.3,
        totalProjectedLivesSaved: 14,
        projectedCo2ReductionTons: 6.7,
        interventionKeys: ['third-ward-gardens', 'greenspoint-trees'],
      },
    ],
    reports: [
      { title: 'Houston Equity Cooling Brief', type: 'COUNCIL_BRIEF', status: 'COMPLETED', tone: 'ACCESSIBLE', content: 'Houston approved an equity-first cooling package focused on shade and community green space.' },
    ],
  },
  {
    name: 'Bolpur',
    slug: 'bolpur-wb',
    state: 'West Bengal',
    country: 'India',
    lat: 23.6693,
    lng: 87.7214,
    admin: { email: 'admin@bolpur.gov.in', name: 'Sujoy Mukherjee' },
    planner: { email: 'planner@bolpur.gov.in', name: 'Ananya Das' },
    council: { email: 'council@bolpur.gov.in', name: 'Ratan Ghosh' },
    neighborhoods: [
      { name: 'Bolpur Town', population: 35000, areaSqkm: 6.2, medianIncome: 18000, pctElderly: 14, pctChildren: 24, avgTempCelsius: 42.5, maxTempCelsius: 45.8, minTempCelsius: 38.2, treeCanopyPct: 18, imperviousSurfacePct: 55 },
      { name: 'Santiniketan', population: 22000, areaSqkm: 8.4, medianIncome: 24000, pctElderly: 11, pctChildren: 18, avgTempCelsius: 41.0, maxTempCelsius: 44.2, minTempCelsius: 37.0, treeCanopyPct: 32, imperviousSurfacePct: 35 },
      { name: 'Surul', population: 12000, areaSqkm: 4.8, medianIncome: 14000, pctElderly: 16, pctChildren: 28, avgTempCelsius: 43.2, maxTempCelsius: 46.5, minTempCelsius: 39.0, treeCanopyPct: 10, imperviousSurfacePct: 62 },
      { name: 'Prantik', population: 8500, areaSqkm: 3.1, medianIncome: 16000, pctElderly: 13, pctChildren: 22, avgTempCelsius: 42.0, maxTempCelsius: 45.0, minTempCelsius: 38.5, treeCanopyPct: 15, imperviousSurfacePct: 50 },
    ],
    interventions: [
      { key: 'surul-trees', name: 'Surul Tree Corridor', neighborhoodName: 'Surul', type: 'TREE_PLANTING', status: 'APPROVED', estimatedCostUsd: 85000, estimatedTempReductionC: 0.9, location: '23.655,87.735' },
      { key: 'bolpur-roofs', name: 'Bolpur Cool Roof Program', neighborhoodName: 'Bolpur Town', type: 'COOL_ROOF', status: 'APPROVED', estimatedCostUsd: 120000, estimatedTempReductionC: 0.5, location: '23.669,87.721' },
      { key: 'prantik-gardens', name: 'Prantik Community Garden', neighborhoodName: 'Prantik', type: 'URBAN_GARDEN', status: 'IN_PROGRESS', estimatedCostUsd: 65000, estimatedTempReductionC: 0.4, location: '23.680,87.708' },
      { key: 'santiniketan-canopy', name: 'Santiniketan Canopy Restoration', neighborhoodName: 'Santiniketan', type: 'TREE_PLANTING', status: 'PROPOSED', estimatedCostUsd: 95000, estimatedTempReductionC: 0.7, location: '23.683,87.685' },
    ],
    scenarios: [
      {
        name: 'Summer 2025 Bolpur Heat Action Plan',
        description: 'Targets CRITICAL neighborhoods with tree planting and cool roofs before peak summer.',
        status: 'APPROVED',
        priority: 'IMMEDIATE',
        totalEstimatedCostUsd: 205000,
        totalProjectedTempReductionC: 1.4,
        totalProjectedLivesSaved: 18,
        projectedCo2ReductionTons: 8.2,
        interventionKeys: ['surul-trees', 'bolpur-roofs'],
        councilNotes: 'Approved by Municipal Commissioner. AMRUT co-funding applied.',
      },
      {
        name: 'Shantiniketan Heritage Green Belt',
        description: 'Canopy restoration and community gardens to protect the heritage zone.',
        status: 'SUBMITTED',
        priority: 'SHORT_TERM',
        totalEstimatedCostUsd: 160000,
        totalProjectedTempReductionC: 1.1,
        totalProjectedLivesSaved: 10,
        projectedCo2ReductionTons: 5.5,
        interventionKeys: ['santiniketan-canopy', 'prantik-gardens'],
      },
    ],
    reports: [
      { title: 'Bolpur Heat Resilience Plan 2025', type: 'SCENARIO_IMPACT', status: 'COMPLETED', tone: 'TECHNICAL', content: 'Bolpur municipality faces severe UHI intensity in Surul and Bolpur Town wards. This plan projects a 1.4°C reduction through targeted tree planting and cool roof programs, protecting 18 vulnerable residents per summer season.' },
    ],
  },
];

async function resetDatabase() {
  await prisma.commissionerApproval.deleteMany();
  await prisma.nGOSurvey.deleteMany();
  await prisma.stateObserverNote.deleteMany();
  await prisma.citizenReport.deleteMany();
  await prisma.wardOfficerReport.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.weatherReading.deleteMany();
  await prisma.weatherStation.deleteMany();
  await prisma.report.deleteMany();
  await prisma.simulationResult.deleteMany();
  await prisma.scenarioIntervention.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.intervention.deleteMany();
  await prisma.heatMeasurement.deleteMany();
  await prisma.neighborhood.deleteMany();
  await prisma.dataIngestionJob.deleteMany();
  await prisma.onboardingState.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.city.deleteMany();
}

async function seedCity(cityConfig: SeedCity, userPasswordHash: string) {
  const city = await prisma.city.create({
    data: {
      name: cityConfig.name,
      slug: cityConfig.slug,
      state: cityConfig.state,
      country: cityConfig.country,
      lat: cityConfig.lat,
      lng: cityConfig.lng,
    },
  });

  const cityAdmin = await prisma.user.create({
    data: {
      email: cityConfig.admin.email,
      name: cityConfig.admin.name,
      passwordHash: userPasswordHash,
      role: 'CITY_ADMIN',
      cityId: city.id,
    },
  });

  const planner = await prisma.user.create({
    data: {
      email: cityConfig.planner.email,
      name: cityConfig.planner.name,
      passwordHash: userPasswordHash,
      role: 'URBAN_PLANNER',
      cityId: city.id,
    },
  });

  const council = await prisma.user.create({
    data: {
      email: cityConfig.council.email,
      name: cityConfig.council.name,
      passwordHash: userPasswordHash,
      role: 'CITY_COUNCIL',
      cityId: city.id,
    },
  });

  // New role users
  const commissioner = await prisma.user.create({
    data: {
      email: `commissioner@${cityConfig.slug.replace(/[^a-z]/g, '')}.gov`,
      name: `Commissioner ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'MUNICIPAL_COMMISSIONER',
      cityId: city.id,
    },
  });

  const wardOfficer = await prisma.user.create({
    data: {
      email: `ward@${cityConfig.slug.replace(/[^a-z]/g, '')}.gov`,
      name: `Ward Officer ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'WARD_OFFICER',
      cityId: city.id,
    },
  });

  await prisma.user.create({
    data: {
      email: `sdma@${cityConfig.slug.replace(/[^a-z]/g, '')}.gov`,
      name: `SDMA Observer ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'SDMA_OBSERVER',
      cityId: city.id,
    },
  });

  await prisma.user.create({
    data: {
      email: `analyst@${cityConfig.slug.replace(/[^a-z]/g, '')}.gov`,
      name: `Data Analyst ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'DATA_ANALYST',
      cityId: city.id,
    },
  });

  await prisma.user.create({
    data: {
      email: `citizen@${cityConfig.slug.replace(/[^a-z]/g, '')}.gov`,
      name: `Citizen Reporter ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'CITIZEN_REPORTER',
      cityId: city.id,
    },
  });

  await prisma.user.create({
    data: {
      email: `ngo@${cityConfig.slug.replace(/[^a-z]/g, '')}.org`,
      name: `NGO Worker ${cityConfig.name.split(',')[0]}`,
      passwordHash: userPasswordHash,
      role: 'NGO_FIELD_WORKER',
      cityId: city.id,
    },
  });

  // Create a ward
  const ward = await prisma.ward.create({
    data: {
      wardNumber: '1',
      wardName: `Ward 1 - ${cityConfig.neighborhoods[0]?.name || 'Central'}`,
      cityId: city.id,
      officerId: wardOfficer.id,
    },
  });

  // Sample ward officer report
  await prisma.wardOfficerReport.create({
    data: {
      wardId: ward.id,
      officerId: wardOfficer.id,
      status: 'IN_PROGRESS',
      actualTempReading: cityConfig.neighborhoods[0]?.avgTempCelsius || 40,
      notes: 'Weekly routine heat assessment completed.',
    },
  });

  // Sample commissioner approval is created after scenarios (skipped for simplicity in seed)

  await prisma.onboardingState.create({
    data: {
      cityId: city.id,
      step1City: true,
      step2Neighbors: true,
      step3Heat: true,
      step4Team: true,
      step5Alerts: true,
      step6Complete: true,
      isComplete: true,
    },
  });

  const neighborhoodMap = new Map<string, string>();
  for (const neighborhood of cityConfig.neighborhoods) {
    const createdNeighborhood = await prisma.neighborhood.create({
      data: {
        cityId: city.id,
        name: neighborhood.name,
        population: neighborhood.population,
        areaSqkm: neighborhood.areaSqkm,
        medianIncome: neighborhood.medianIncome,
        pctElderly: neighborhood.pctElderly,
        pctChildren: neighborhood.pctChildren,
      },
    });

    neighborhoodMap.set(neighborhood.name, createdNeighborhood.id);

    await prisma.heatMeasurement.create({
      data: {
        neighborhoodId: createdNeighborhood.id,
        measurementDate: new Date('2024-08-01T12:00:00Z'),
        avgTempCelsius: neighborhood.avgTempCelsius,
        maxTempCelsius: neighborhood.maxTempCelsius,
        minTempCelsius: neighborhood.minTempCelsius,
        treeCanopyPct: neighborhood.treeCanopyPct,
        imperviousSurfacePct: neighborhood.imperviousSurfacePct,
        dataSource: 'SEED_DATA',
      },
    });
  }

  const interventionMap = new Map<string, string>();
  for (const intervention of cityConfig.interventions) {
    const createdIntervention = await prisma.intervention.create({
      data: {
        cityId: city.id,
        neighborhoodId: neighborhoodMap.get(intervention.neighborhoodName),
        name: intervention.name,
        type: intervention.type,
        status: intervention.status,
        estimatedCostUsd: intervention.estimatedCostUsd,
        estimatedTempReductionC: intervention.estimatedTempReductionC,
        location: intervention.location,
        proposedById: planner.id,
        approvedById: intervention.status === 'APPROVED' ? cityAdmin.id : null,
        approvedAt: intervention.status === 'APPROVED' ? new Date('2024-10-15T12:00:00Z') : null,
      },
    });

    interventionMap.set(intervention.key, createdIntervention.id);
  }

  for (const scenario of cityConfig.scenarios) {
    const createdScenario = await prisma.scenario.create({
      data: {
        cityId: city.id,
        name: scenario.name,
        description: scenario.description,
        status: scenario.status,
        priority: scenario.priority,
        totalEstimatedCostUsd: scenario.totalEstimatedCostUsd,
        totalProjectedTempReductionC: scenario.totalProjectedTempReductionC,
        totalProjectedLivesSaved: scenario.totalProjectedLivesSaved,
        projectedCo2ReductionTons: scenario.projectedCo2ReductionTons,
        revisionNotes: scenario.revisionNotes || null,
        councilNotes: scenario.councilNotes || null,
        createdById: planner.id,
        approvedById: scenario.status === 'APPROVED' ? cityAdmin.id : null,
        submittedAt: new Date('2024-10-10T12:00:00Z'),
        approvedAt: scenario.status === 'APPROVED' ? new Date('2024-10-15T12:00:00Z') : null,
      },
    });

    for (const interventionKey of scenario.interventionKeys) {
      const interventionId = interventionMap.get(interventionKey);
      if (!interventionId) {
        continue;
      }

      await prisma.scenarioIntervention.create({
        data: {
          scenarioId: createdScenario.id,
          interventionId,
        },
      });
    }

    await prisma.simulationResult.create({
      data: {
        scenarioId: createdScenario.id,
        outputSummary: JSON.stringify({
          averageTempReductionCelsius: scenario.totalProjectedTempReductionC,
          livesProtectedPerSummer: scenario.totalProjectedLivesSaved,
          projectedCo2ReductionTons: scenario.projectedCo2ReductionTons,
          costPerLifeProtected: Math.round(scenario.totalEstimatedCostUsd / Math.max(scenario.totalProjectedLivesSaved, 1)),
        }),
        neighborhoodResults: JSON.stringify(
          scenario.interventionKeys.map((interventionKey) => {
            const intervention = cityConfig.interventions.find((item) => item.key === interventionKey);
            return {
              neighborhood: intervention?.neighborhoodName || 'City-wide',
              reductionCelsius: intervention?.estimatedTempReductionC || 0,
              livesSaved: Math.max(1, Math.round((intervention?.estimatedTempReductionC || 0) * 8)),
            };
          })
        ),
        modelVersion: 'workflow-v1',
      },
    });
  }

  for (const report of cityConfig.reports) {
    await prisma.report.create({
      data: {
        cityId: city.id,
        title: report.title,
        type: report.type,
        status: report.status,
        tone: report.tone,
        content: report.content,
        generatedById: planner.id,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        userId: cityAdmin.id,
        action: 'CITY_SEEDED',
        resourceType: 'City',
        resourceId: city.id,
        afterValue: JSON.stringify({ city: city.name }),
      },
      {
        userId: planner.id,
        action: 'WORKFLOW_READY',
        resourceType: 'City',
        resourceId: city.id,
        afterValue: JSON.stringify({ neighborhoods: cityConfig.neighborhoods.length, interventions: cityConfig.interventions.length }),
      },
      {
        userId: council.id,
        action: 'COUNCIL_VIEW_READY',
        resourceType: 'City',
        resourceId: city.id,
      },
    ],
  });
}

async function main() {
  console.log('🌱 Seeding database...');
  await resetDatabase();

  const superAdminPw = await bcrypt.hash('Admin@HeatPlan2024!', 12);
  const userPw = await bcrypt.hash('User@HeatPlan2024!', 12);

  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@heatplan.io',
      name: 'Super Admin',
      passwordHash: superAdminPw,
      role: 'SUPER_ADMIN',
    },
  });

  for (const cityConfig of cities) {
    await seedCity(cityConfig, userPw);
  }

  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'SEED_DATABASE',
      resourceType: 'System',
      afterValue: JSON.stringify({ cities: cities.map((city) => city.slug) }),
    },
  });

  console.log('✅ Seed complete!');
  console.log(`   Cities: ${cities.length} (${cities.map((c) => c.name).join(', ')})`);
  console.log(`   Users: ${1 + cities.length * 9} (admin@heatplan.io / Admin@HeatPlan2024!)`);
  console.log(`   All role passwords: User@HeatPlan2024!`);
  console.log(`   Roles seeded: CITY_ADMIN, URBAN_PLANNER, CITY_COUNCIL, MUNICIPAL_COMMISSIONER, WARD_OFFICER, SDMA_OBSERVER, DATA_ANALYST, CITIZEN_REPORTER, NGO_FIELD_WORKER`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
