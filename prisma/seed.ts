import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type SeedPlace = {
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
  placeName: string;
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
  places: SeedPlace[];
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
    places: [
      { name: 'Rundberg', population: 28000, areaSqkm: 7.8, medianIncome: 31000, pctElderly: 16, pctChildren: 28, avgTempCelsius: 41.8, maxTempCelsius: 44.2, minTempCelsius: 38.1, treeCanopyPct: 9, imperviousSurfacePct: 78 },
      { name: 'Rosewood', population: 18000, areaSqkm: 4.7, medianIncome: 42000, pctElderly: 12, pctChildren: 21, avgTempCelsius: 41.2, maxTempCelsius: 43.7, minTempCelsius: 37.8, treeCanopyPct: 14, imperviousSurfacePct: 70 },
      { name: 'North Loop', population: 14500, areaSqkm: 3.9, medianIncome: 47000, pctElderly: 9, pctChildren: 17, avgTempCelsius: 40.8, maxTempCelsius: 43.0, minTempCelsius: 37.2, treeCanopyPct: 16, imperviousSurfacePct: 64 },
      { name: 'Downtown', population: 12500, areaSqkm: 3.2, medianIncome: 75000, pctElderly: 8, pctChildren: 5, avgTempCelsius: 39.9, maxTempCelsius: 42.1, minTempCelsius: 36.5, treeCanopyPct: 18, imperviousSurfacePct: 68 },
    ],
    interventions: [
      { key: 'rundberg-trees', name: 'Rundberg Tree Planting', placeName: 'Rundberg', type: 'TREE_PLANTING', status: 'APPROVED', estimatedCostUsd: 120000, estimatedTempReductionC: 0.8, location: '30.355,-97.707' },
      { key: 'rosewood-roofs', name: 'East Austin Green Roofs', placeName: 'Rosewood', type: 'GREEN_ROOF', status: 'APPROVED', estimatedCostUsd: 750000, estimatedTempReductionC: 0.6, location: '30.279,-97.700' },
      { key: 'northloop-white-roofs', name: 'North Loop White Roofs', placeName: 'North Loop', type: 'COOL_ROOF', status: 'APPROVED', estimatedCostUsd: 375000, estimatedTempReductionC: 0.4, location: '30.318,-97.722' },
      { key: 'rundberg-active-trees', name: 'Tree Planting Ph.1', placeName: 'Rundberg', type: 'TREE_PLANTING', status: 'IN_PROGRESS', estimatedCostUsd: 90000, estimatedTempReductionC: 0.6, location: '30.357,-97.709' },
    ],
    scenarios: [
      {
        name: 'Summer 2025 Emergency Cooling Plan',
        description: 'Focuses on the two CRITICAL places with the strongest cost-per-degree options first.',
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
    places: [
      { name: 'Maryvale', population: 24000, areaSqkm: 8.1, medianIncome: 36000, pctElderly: 11, pctChildren: 24, avgTempCelsius: 43.4, maxTempCelsius: 46.0, minTempCelsius: 39.1, treeCanopyPct: 7, imperviousSurfacePct: 81 },
      { name: 'Encanto', population: 19000, areaSqkm: 5.6, medianIncome: 51000, pctElderly: 13, pctChildren: 18, avgTempCelsius: 42.0, maxTempCelsius: 44.8, minTempCelsius: 38.0, treeCanopyPct: 12, imperviousSurfacePct: 74 },
      { name: 'Downtown Phoenix', population: 16500, areaSqkm: 4.1, medianIncome: 69000, pctElderly: 7, pctChildren: 9, avgTempCelsius: 41.1, maxTempCelsius: 44.0, minTempCelsius: 37.5, treeCanopyPct: 15, imperviousSurfacePct: 77 },
    ],
    interventions: [
      { key: 'maryvale-misters', name: 'Maryvale Mist Station Network', placeName: 'Maryvale', type: 'MIST_STATION', status: 'IN_PROGRESS', estimatedCostUsd: 140000, estimatedTempReductionC: 0.5, location: '33.492,-112.185' },
      { key: 'encanto-pavement', name: 'Encanto Cool Pavement Pilot', placeName: 'Encanto', type: 'COOL_PAVEMENT', status: 'PROPOSED', estimatedCostUsd: 410000, estimatedTempReductionC: 0.7, location: '33.474,-112.105' },
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
    places: [
      { name: 'Third Ward', population: 21000, areaSqkm: 6.3, medianIncome: 38000, pctElderly: 14, pctChildren: 22, avgTempCelsius: 40.6, maxTempCelsius: 43.4, minTempCelsius: 36.9, treeCanopyPct: 11, imperviousSurfacePct: 73 },
      { name: 'Greenspoint', population: 17500, areaSqkm: 5.5, medianIncome: 34000, pctElderly: 12, pctChildren: 26, avgTempCelsius: 41.0, maxTempCelsius: 43.8, minTempCelsius: 37.1, treeCanopyPct: 10, imperviousSurfacePct: 76 },
      { name: 'Midtown', population: 13200, areaSqkm: 3.6, medianIncome: 72000, pctElderly: 8, pctChildren: 8, avgTempCelsius: 39.8, maxTempCelsius: 42.5, minTempCelsius: 36.2, treeCanopyPct: 17, imperviousSurfacePct: 69 },
    ],
    interventions: [
      { key: 'third-ward-gardens', name: 'Third Ward Cooling Gardens', placeName: 'Third Ward', type: 'URBAN_GARDEN', status: 'APPROVED', estimatedCostUsd: 280000, estimatedTempReductionC: 0.6, location: '29.734,-95.357' },
      { key: 'greenspoint-trees', name: 'Greenspoint Shade Tree Program', placeName: 'Greenspoint', type: 'TREE_PLANTING', status: 'IN_PROGRESS', estimatedCostUsd: 195000, estimatedTempReductionC: 0.7, location: '29.940,-95.415' },
    ],
    scenarios: [
      {
        name: 'Equity-First Cooling Plan',
        description: 'Targets high-vulnerability places first with shade and green space interventions.',
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
    places: [
      { name: 'Bolpur Town', population: 35000, areaSqkm: 6.2, medianIncome: 18000, pctElderly: 14, pctChildren: 24, avgTempCelsius: 42.5, maxTempCelsius: 45.8, minTempCelsius: 38.2, treeCanopyPct: 18, imperviousSurfacePct: 55 },
      { name: 'Santiniketan', population: 22000, areaSqkm: 8.4, medianIncome: 24000, pctElderly: 11, pctChildren: 18, avgTempCelsius: 41.0, maxTempCelsius: 44.2, minTempCelsius: 37.0, treeCanopyPct: 32, imperviousSurfacePct: 35 },
      { name: 'Surul', population: 12000, areaSqkm: 4.8, medianIncome: 14000, pctElderly: 16, pctChildren: 28, avgTempCelsius: 43.2, maxTempCelsius: 46.5, minTempCelsius: 39.0, treeCanopyPct: 10, imperviousSurfacePct: 62 },
      { name: 'Prantik', population: 8500, areaSqkm: 3.1, medianIncome: 16000, pctElderly: 13, pctChildren: 22, avgTempCelsius: 42.0, maxTempCelsius: 45.0, minTempCelsius: 38.5, treeCanopyPct: 15, imperviousSurfacePct: 50 },
    ],
    interventions: [
      { key: 'surul-trees', name: 'Surul Tree Corridor', placeName: 'Surul', type: 'TREE_PLANTING', status: 'APPROVED', estimatedCostUsd: 85000, estimatedTempReductionC: 0.9, location: '23.655,87.735' },
      { key: 'bolpur-roofs', name: 'Bolpur Cool Roof Program', placeName: 'Bolpur Town', type: 'COOL_ROOF', status: 'APPROVED', estimatedCostUsd: 120000, estimatedTempReductionC: 0.5, location: '23.669,87.721' },
      { key: 'prantik-gardens', name: 'Prantik Community Garden', placeName: 'Prantik', type: 'URBAN_GARDEN', status: 'IN_PROGRESS', estimatedCostUsd: 65000, estimatedTempReductionC: 0.4, location: '23.680,87.708' },
      { key: 'santiniketan-canopy', name: 'Santiniketan Canopy Restoration', placeName: 'Santiniketan', type: 'TREE_PLANTING', status: 'PROPOSED', estimatedCostUsd: 95000, estimatedTempReductionC: 0.7, location: '23.683,87.685' },
    ],
    scenarios: [
      {
        name: 'Summer 2025 Bolpur Heat Action Plan',
        description: 'Targets CRITICAL places with tree planting and cool roofs before peak summer.',
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
  {
    name: 'Pune',
    slug: 'pune-mh',
    state: 'Maharashtra',
    country: 'India',
    lat: 18.5204,
    lng: 73.8567,
    admin: { email: 'admin@pune.gov.in', name: 'Ravindra Deshmukh' },
    planner: { email: 'planner@pune.gov.in', name: 'Priya Joshi' },
    council: { email: 'council@pune.gov.in', name: 'Suresh Patil' },
    places: [
      { name: 'Hadapsar', population: 48000, areaSqkm: 9.2, medianIncome: 32000, pctElderly: 10, pctChildren: 26, avgTempCelsius: 43.1, maxTempCelsius: 46.4, minTempCelsius: 39.5, treeCanopyPct: 8, imperviousSurfacePct: 82 },
      { name: 'Kondhwa', population: 35000, areaSqkm: 7.6, medianIncome: 28000, pctElderly: 13, pctChildren: 29, avgTempCelsius: 44.0, maxTempCelsius: 47.1, minTempCelsius: 40.2, treeCanopyPct: 6, imperviousSurfacePct: 85 },
      { name: 'Kothrud', population: 29000, areaSqkm: 6.1, medianIncome: 55000, pctElderly: 15, pctChildren: 14, avgTempCelsius: 41.5, maxTempCelsius: 44.0, minTempCelsius: 37.8, treeCanopyPct: 20, imperviousSurfacePct: 65 },
      { name: 'Yerawada', population: 22000, areaSqkm: 5.3, medianIncome: 24000, pctElderly: 14, pctChildren: 27, avgTempCelsius: 43.8, maxTempCelsius: 46.9, minTempCelsius: 40.0, treeCanopyPct: 7, imperviousSurfacePct: 80 },
      { name: 'Aundh', population: 38000, areaSqkm: 8.0, medianIncome: 68000, pctElderly: 9, pctChildren: 11, avgTempCelsius: 40.5, maxTempCelsius: 43.2, minTempCelsius: 36.8, treeCanopyPct: 25, imperviousSurfacePct: 58 },
    ],
    interventions: [
      { key: 'hadapsar-trees', name: 'Hadapsar Industrial Green Buffer', placeName: 'Hadapsar', type: 'TREE_PLANTING', status: 'APPROVED', estimatedCostUsd: 135000, estimatedTempReductionC: 0.9, location: '18.506,73.930' },
      { key: 'kondhwa-roofs', name: 'Kondhwa Cool Roof Scheme', placeName: 'Kondhwa', type: 'COOL_ROOF', status: 'APPROVED', estimatedCostUsd: 220000, estimatedTempReductionC: 0.7, location: '18.490,73.875' },
      { key: 'yerawada-pavement', name: 'Yerawada Cool Pavement Pilot', placeName: 'Yerawada', type: 'COOL_PAVEMENT', status: 'IN_PROGRESS', estimatedCostUsd: 180000, estimatedTempReductionC: 0.6, location: '18.554,73.883' },
      { key: 'kothrud-garden', name: 'Kothrud Community Cooling Garden', placeName: 'Kothrud', type: 'URBAN_GARDEN', status: 'APPROVED', estimatedCostUsd: 95000, estimatedTempReductionC: 0.5, location: '18.508,73.814' },
      { key: 'aundh-canopy', name: 'Aundh Avenue Tree Canopy Expansion', placeName: 'Aundh', type: 'TREE_PLANTING', status: 'PROPOSED', estimatedCostUsd: 110000, estimatedTempReductionC: 0.6, location: '18.558,73.807' },
    ],
    scenarios: [
      {
        name: 'Pune Summer Heat Shield 2025',
        description: 'Emergency intervention targeting the two most heat-stressed industrial-residential zones in east Pune.',
        status: 'APPROVED',
        priority: 'IMMEDIATE',
        totalEstimatedCostUsd: 355000,
        totalProjectedTempReductionC: 1.6,
        totalProjectedLivesSaved: 22,
        projectedCo2ReductionTons: 9.8,
        interventionKeys: ['hadapsar-trees', 'kondhwa-roofs'],
        councilNotes: 'Approved under PMC Climate Resilience Fund. State SDMA co-financing confirmed.',
      },
      {
        name: 'Inclusive Cooling Corridors',
        description: 'Cool pavements, community gardens and avenue trees to create linked shade corridors across vulnerable wards.',
        status: 'SUBMITTED',
        priority: 'SHORT_TERM',
        totalEstimatedCostUsd: 385000,
        totalProjectedTempReductionC: 1.7,
        totalProjectedLivesSaved: 19,
        projectedCo2ReductionTons: 7.4,
        interventionKeys: ['yerawada-pavement', 'kothrud-garden', 'aundh-canopy'],
      },
    ],
    reports: [
      { title: 'Pune Heat Resilience Action Plan 2025', type: 'SCENARIO_IMPACT', status: 'COMPLETED', tone: 'TECHNICAL', content: 'Pune faces critical urban heat island intensity in Hadapsar and Kondhwa due to dense impervious surfaces and industrial heat load. This plan projects a 1.6°C reduction covering 22 vulnerable residents per summer through tree planting and cool roof interventions under PMC Climate Resilience Fund support.' },
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
  await prisma.place.deleteMany();
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
      wardName: `Ward 1 - ${cityConfig.places[0]?.name || 'Central'}`,
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
      actualTempReading: cityConfig.places[0]?.avgTempCelsius || 40,
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

  const placeMap = new Map<string, string>();
  for (const place of cityConfig.places) {
    const createdPlace = await prisma.place.create({
      data: {
        cityId: city.id,
        name: place.name,
        population: place.population,
        areaSqkm: place.areaSqkm,
        medianIncome: place.medianIncome,
        pctElderly: place.pctElderly,
        pctChildren: place.pctChildren,
      },
    });

    placeMap.set(place.name, createdPlace.id);

    await prisma.heatMeasurement.create({
      data: {
        placeId: createdPlace.id,
        measurementDate: new Date('2024-08-01T12:00:00Z'),
        avgTempCelsius: place.avgTempCelsius,
        maxTempCelsius: place.maxTempCelsius,
        minTempCelsius: place.minTempCelsius,
        treeCanopyPct: place.treeCanopyPct,
        imperviousSurfacePct: place.imperviousSurfacePct,
        dataSource: 'SEED_DATA',
      },
    });

    // Second measurement — 30 days later, slightly different temps
    await prisma.heatMeasurement.create({
      data: {
        placeId: createdPlace.id,
        measurementDate: new Date('2024-09-01T12:00:00Z'),
        avgTempCelsius: place.avgTempCelsius - 0.8,
        maxTempCelsius: place.maxTempCelsius - 1.0,
        minTempCelsius: place.minTempCelsius - 0.5,
        treeCanopyPct: place.treeCanopyPct,
        imperviousSurfacePct: place.imperviousSurfacePct,
        dataSource: 'SEED_DATA',
      },
    });

    // Second measurement — 30 days later, slightly different temps
    await prisma.heatMeasurement.create({
      data: {
        placeId: createdPlace.id,
        measurementDate: new Date('2024-09-01T12:00:00Z'),
        avgTempCelsius: place.avgTempCelsius - 0.8,
        maxTempCelsius: place.maxTempCelsius - 1.0,
        minTempCelsius: place.minTempCelsius - 0.5,
        treeCanopyPct: place.treeCanopyPct,
        imperviousSurfacePct: place.imperviousSurfacePct,
        dataSource: 'SEED_DATA',
      },
    });
  }

  const interventionMap = new Map<string, string>();
  for (const intervention of cityConfig.interventions) {
    const createdIntervention = await prisma.intervention.create({
      data: {
        cityId: city.id,
        placeId: placeMap.get(intervention.placeName),
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
        placeResults: JSON.stringify(
          scenario.interventionKeys.map((interventionKey) => {
            const intervention = cityConfig.interventions.find((item) => item.key === interventionKey);
            return {
              place: intervention?.placeName || 'City-wide',
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
        afterValue: JSON.stringify({ places: cityConfig.places.length, interventions: cityConfig.interventions.length }),
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
