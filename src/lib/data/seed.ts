// Seed data for Urban Heat Mitigator

export interface CityZone {
  id: string;
  name: string;
  heatIndex: number;
  surfaceAlbedo: number;
  treeCanopyPct: number;
  populationDensity: number;
  avgTemp: number;
  maxTemp: number;
  coordinates: [number, number];
  bounds: [number, number][];
  vulnerabilityScore: number;
  medianAge: number;
  povertyRate: number;
  elderlyPct: number;
}

export interface Intervention {
  id: string;
  type: 'tree' | 'green_roof' | 'cool_pavement' | 'mist_station' | 'park' | 'white_roof';
  name: string;
  zoneId: string;
  parameters: Record<string, number | string>;
  estimatedCostUsd: number;
  status: 'proposed' | 'approved' | 'in_progress' | 'completed';
  tempReduction: number;
  coordinates: [number, number];
}

export interface SimulationRun {
  id: string;
  scenarioName: string;
  interventions: string[];
  projectedTempReduction: number;
  confidenceInterval: [number, number];
  totalCost: number;
  livesSaved: number;
  coolingEfficiency: number;
  implementationMonths: number;
}

export interface BaselineMeasurement {
  year: number;
  month: number;
  avgTempCelsius: number;
  maxTempCelsius: number;
  heatDeathsEstimated: number;
}

export interface TreeRequest {
  id: string;
  species: string;
  address: string;
  coordinates: [number, number];
  residentName: string;
  status: 'pending' | 'site_survey' | 'scheduled' | 'planted';
  progress: number;
  submittedDate: string;
  plantingDate?: string;
  tempImpact: number;
  soilHealth: string;
  growthHeight: number;
  lastInspection: string;
  imageUrl: string;
}

export interface VulnerabilityHotspot {
  id: string;
  name: string;
  score: number;
  icon: string;
  factors: string[];
}

// === SEED DATA ===

export const cityZones: CityZone[] = [
  {
    id: 'z1', name: 'Industrial District VII', heatIndex: 9.4, surfaceAlbedo: 0.12,
    treeCanopyPct: 4, populationDensity: 2800, avgTemp: 38.4, maxTemp: 44.2,
    coordinates: [40.7128, -74.006], bounds: [[40.71, -74.01], [40.72, -74.0], [40.72, -73.99], [40.71, -73.99]],
    vulnerabilityScore: 9.4, medianAge: 42, povertyRate: 38, elderlyPct: 22,
  },
  {
    id: 'z2', name: 'Riverview Heights', heatIndex: 8.8, surfaceAlbedo: 0.18,
    treeCanopyPct: 8, populationDensity: 4200, avgTemp: 36.8, maxTemp: 42.1,
    coordinates: [40.7189, -74.012], bounds: [[40.715, -74.02], [40.725, -74.02], [40.725, -74.01], [40.715, -74.01]],
    vulnerabilityScore: 8.8, medianAge: 68, povertyRate: 24, elderlyPct: 35,
  },
  {
    id: 'z3', name: 'North Station Corridor', heatIndex: 8.2, surfaceAlbedo: 0.15,
    treeCanopyPct: 12, populationDensity: 6100, avgTemp: 35.6, maxTemp: 40.8,
    coordinates: [40.7282, -74.002], bounds: [[40.725, -74.01], [40.735, -74.01], [40.735, -73.99], [40.725, -73.99]],
    vulnerabilityScore: 8.2, medianAge: 34, povertyRate: 18, elderlyPct: 12,
  },
  {
    id: 'z4', name: 'Central Business District', heatIndex: 7.6, surfaceAlbedo: 0.2,
    treeCanopyPct: 15, populationDensity: 8500, avgTemp: 34.8, maxTemp: 39.5,
    coordinates: [40.7061, -74.009], bounds: [[40.70, -74.015], [40.71, -74.015], [40.71, -74.005], [40.70, -74.005]],
    vulnerabilityScore: 7.6, medianAge: 38, povertyRate: 8, elderlyPct: 10,
  },
  {
    id: 'z5', name: 'Old Town South', heatIndex: 7.9, surfaceAlbedo: 0.16,
    treeCanopyPct: 10, populationDensity: 3800, avgTemp: 35.2, maxTemp: 41.0,
    coordinates: [40.7350, -74.015], bounds: [[40.73, -74.02], [40.74, -74.02], [40.74, -74.01], [40.73, -74.01]],
    vulnerabilityScore: 7.9, medianAge: 55, povertyRate: 28, elderlyPct: 25,
  },
  {
    id: 'z6', name: 'Lakeside Terrace', heatIndex: 7.5, surfaceAlbedo: 0.22,
    treeCanopyPct: 18, populationDensity: 3200, avgTemp: 33.8, maxTemp: 38.4,
    coordinates: [40.7400, -73.998], bounds: [[40.735, -74.005], [40.745, -74.005], [40.745, -73.995], [40.735, -73.995]],
    vulnerabilityScore: 7.5, medianAge: 45, povertyRate: 32, elderlyPct: 18,
  },
  {
    id: 'z7', name: 'Ward 7: North Creek', heatIndex: 9.1, surfaceAlbedo: 0.11,
    treeCanopyPct: 6, populationDensity: 4800, avgTemp: 40.0, maxTemp: 45.5,
    coordinates: [40.7500, -74.008], bounds: [[40.745, -74.015], [40.755, -74.015], [40.755, -74.005], [40.745, -74.005]],
    vulnerabilityScore: 9.1, medianAge: 36, povertyRate: 42, elderlyPct: 15,
  },
  {
    id: 'z8', name: 'Greenfield West', heatIndex: 5.2, surfaceAlbedo: 0.35,
    treeCanopyPct: 32, populationDensity: 2100, avgTemp: 31.2, maxTemp: 35.8,
    coordinates: [40.7220, -74.025], bounds: [[40.718, -74.03], [40.728, -74.03], [40.728, -74.02], [40.718, -74.02]],
    vulnerabilityScore: 5.2, medianAge: 40, povertyRate: 12, elderlyPct: 14,
  },
];

export const interventions: Intervention[] = [
  { id: 'i1', type: 'tree', name: 'Elm St Corridor Planting', zoneId: 'z1', parameters: { trees: 50, species: 'White Oak' }, estimatedCostUsd: 125000, status: 'in_progress', tempReduction: 0.8, coordinates: [40.7135, -74.005] },
  { id: 'i2', type: 'cool_pavement', name: 'Westside Cool Pavement', zoneId: 'z3', parameters: { areaSqM: 48000, albedo: 0.45 }, estimatedCostUsd: 180000, status: 'completed', tempReduction: 1.2, coordinates: [40.7290, -74.001] },
  { id: 'i3', type: 'green_roof', name: 'CBD Green Roof Program', zoneId: 'z4', parameters: { units: 84, avgArea: 200 }, estimatedCostUsd: 320000, status: 'in_progress', tempReduction: 0.6, coordinates: [40.7065, -74.008] },
  { id: 'i4', type: 'mist_station', name: 'Downtown Misting Stations', zoneId: 'z4', parameters: { stations: 12 }, estimatedCostUsd: 48000, status: 'approved', tempReduction: 0.1, coordinates: [40.7070, -74.010] },
  { id: 'i5', type: 'tree', name: 'Riverview Shade Trees', zoneId: 'z2', parameters: { trees: 120, species: 'Sugar Maple' }, estimatedCostUsd: 280000, status: 'proposed', tempReduction: 1.4, coordinates: [40.7195, -74.013] },
  { id: 'i6', type: 'cool_pavement', name: 'East Industrial Resurfacing', zoneId: 'z1', parameters: { areaSqM: 95000, albedo: 0.50 }, estimatedCostUsd: 420000, status: 'proposed', tempReduction: 2.1, coordinates: [40.7140, -74.004] },
  { id: 'i7', type: 'park', name: 'North Creek Green Corridor', zoneId: 'z7', parameters: { areaSqM: 25000, vegetationDensity: 0.8 }, estimatedCostUsd: 850000, status: 'approved', tempReduction: 1.8, coordinates: [40.7510, -74.007] },
];

export const scenarioPlanA: SimulationRun = {
  id: 'sim-a', scenarioName: 'Budget Plan A', interventions: ['i1', 'i2', 'i3', 'i4'],
  projectedTempReduction: 1.4, confidenceInterval: [1.0, 1.8],
  totalCost: 18100000, livesSaved: 2400, coolingEfficiency: 0.42, implementationMonths: 18,
};

export const scenarioPlanB: SimulationRun = {
  id: 'sim-b', scenarioName: 'Max Impact Plan B', interventions: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7'],
  projectedTempReduction: 3.2, confidenceInterval: [2.4, 4.0],
  totalCost: 58300000, livesSaved: 5100, coolingEfficiency: 0.89, implementationMonths: 42,
};

export const baselineMeasurements: BaselineMeasurement[] = [
  { year: 2024, month: 1, avgTempCelsius: 2.1, maxTempCelsius: 8.4, heatDeathsEstimated: 0 },
  { year: 2024, month: 2, avgTempCelsius: 4.3, maxTempCelsius: 12.1, heatDeathsEstimated: 0 },
  { year: 2024, month: 3, avgTempCelsius: 9.8, maxTempCelsius: 18.6, heatDeathsEstimated: 2 },
  { year: 2024, month: 4, avgTempCelsius: 15.2, maxTempCelsius: 24.3, heatDeathsEstimated: 5 },
  { year: 2024, month: 5, avgTempCelsius: 21.4, maxTempCelsius: 30.8, heatDeathsEstimated: 18 },
  { year: 2024, month: 6, avgTempCelsius: 26.8, maxTempCelsius: 36.2, heatDeathsEstimated: 45 },
  { year: 2024, month: 7, avgTempCelsius: 29.4, maxTempCelsius: 39.8, heatDeathsEstimated: 82 },
  { year: 2024, month: 8, avgTempCelsius: 28.6, maxTempCelsius: 38.4, heatDeathsEstimated: 68 },
  { year: 2024, month: 9, avgTempCelsius: 23.8, maxTempCelsius: 33.1, heatDeathsEstimated: 28 },
  { year: 2024, month: 10, avgTempCelsius: 16.4, maxTempCelsius: 25.2, heatDeathsEstimated: 8 },
  { year: 2024, month: 11, avgTempCelsius: 9.2, maxTempCelsius: 16.8, heatDeathsEstimated: 1 },
  { year: 2024, month: 12, avgTempCelsius: 3.8, maxTempCelsius: 10.4, heatDeathsEstimated: 0 },
];

export const treeRequests: TreeRequest[] = [
  {
    id: 'tr1', species: 'White Oak', address: '1248 Beacon St, Brookline',
    coordinates: [42.3601, -71.0589], residentName: 'Maria Santos',
    status: 'pending', progress: 15, submittedDate: '2024-09-12',
    tempImpact: -0.02, soilHealth: 'Good', growthHeight: 0, lastInspection: 'N/A',
    imageUrl: '/trees/white-oak.jpg',
  },
  {
    id: 'tr2', species: 'Sugar Maple', address: '215 Commonwealth Ave, Back Bay',
    coordinates: [42.3485, -71.0850], residentName: 'James Chen',
    status: 'site_survey', progress: 45, submittedDate: '2024-08-28',
    tempImpact: -0.03, soilHealth: 'Optimal', growthHeight: 0, lastInspection: '5 Days Ago',
    imageUrl: '/trees/sugar-maple.jpg',
  },
  {
    id: 'tr3', species: 'American Elm', address: '500 Harrison Ave, South End',
    coordinates: [42.3398, -71.0691], residentName: 'Sarah Williams',
    status: 'scheduled', progress: 80, submittedDate: '2024-07-15',
    plantingDate: '2024-10-24', tempImpact: -0.04, soilHealth: 'Good',
    growthHeight: 0, lastInspection: '3 Days Ago',
    imageUrl: '/trees/american-elm.jpg',
  },
  {
    id: 'tr4', species: 'Red Maple', address: '88 East Berkeley St, Boston Core',
    coordinates: [42.3450, -71.0720], residentName: 'Elena Vance',
    status: 'planted', progress: 100, submittedDate: '2024-05-02',
    plantingDate: '2024-06-13', tempImpact: -0.04, soilHealth: 'Optimal',
    growthHeight: 1.2, lastInspection: '12 Days Ago',
    imageUrl: '/trees/red-maple.jpg',
  },
];

export const vulnerabilityHotspots: VulnerabilityHotspot[] = [
  { id: 'vh1', name: 'Industrial District VII', score: 9.4, icon: 'park', factors: ['Low Canopy (4%)', 'Albedo: 0.12'] },
  { id: 'vh2', name: 'Riverview Heights', score: 8.8, icon: 'groups', factors: ['High Elderly Pop', 'Median Age: 68'] },
  { id: 'vh3', name: 'North Station Corridor', score: 8.2, icon: 'traffic', factors: ['High Transit Density', 'Heat Island +2°F'] },
  { id: 'vh4', name: 'Old Town South', score: 7.9, icon: 'domain', factors: ['Brick Masonry Core', 'Low Ventilation'] },
  { id: 'vh5', name: 'Lakeside Terrace', score: 7.5, icon: 'attach_money', factors: ['Socioeconomic Vulnerability'] },
];

export const interventionBreakdown = [
  { type: 'Cool-Roof Retrofitting', planAUnits: 1200, planACost: '$2.4M', planBUnits: 450, planBCost: '$0.9M', variance: '+$1.5M', varianceColor: 'primary' },
  { type: 'Street-Level Canopy', planAUnits: 4500, planACost: '$6.8M', planBUnits: 12000, planBCost: '$18.2M', variance: '-$11.4M', varianceColor: 'tertiary' },
  { type: 'Bioswales & Pavements', planAUnits: 150, planACost: '$4.2M', planBUnits: 320, planBCost: '$9.6M', variance: '-$5.4M', varianceColor: 'tertiary' },
  { type: 'Vertical Garden Modules', planAUnits: 40, planACost: '$1.1M', planBUnits: 850, planBCost: '$22.4M', variance: '-$21.3M', varianceColor: 'tertiary' },
  { type: 'Public Cooling Hubs', planAUnits: 12, planACost: '$3.6M', planBUnits: 24, planBCost: '$7.2M', variance: '-$3.6M', varianceColor: 'tertiary' },
];

// KPI data
export const kpiData = {
  cityWideTemp: { value: 94.2, unit: '°F', change: 1.2, trend: 'up' as const },
  deathsPrevented: { value: 412, label: 'Projected' },
  treeCanopy: { value: 22.8, unit: '%', change: 3.4 },
  budget: { total: 20000000, spent: 14200000, remaining: 5800000 },
};
