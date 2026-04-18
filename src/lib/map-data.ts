import prisma from '@/lib/db';
import { computeVulnerabilityScore, type VulnerabilityResult } from '@/lib/compute/vulnerability';
import {
  createFallbackNeighborhoodGeometry,
  getGeometryCenter,
  parseBoundaryGeometry,
  parseInterventionPoint,
  type SupportedMapGeometry,
} from '@/lib/map-utils';

export interface CityMapIntervention {
  id: string;
  name: string;
  type: string;
  status: string;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  estimatedTempReductionC: number | null;
  estimatedCostUsd: number | null;
  point: [number, number];
}

export interface CityMapNeighborhood {
  id: string;
  name: string;
  population: number | null;
  avgTemp: number | null;
  maxTemp: number | null;
  treeCanopyPct: number | null;
  imperviousSurfacePct: number | null;
  vulnerabilityScore: number;
  vulnerabilityLevel: VulnerabilityResult['level'];
  geometry: SupportedMapGeometry;
  center: [number, number];
  interventions: Array<{
    id: string;
    name: string;
    status: string;
    estimatedTempReductionC: number | null;
  }>;
}

export interface CityMapPayload {
  city: {
    id: string;
    name: string;
    slug: string;
    lat: number;
    lng: number;
  };
  neighborhoods: CityMapNeighborhood[];
  interventions: CityMapIntervention[];
  stats: {
    criticalCount: number;
    highCount: number;
    interventionCount: number;
    approvedOrActiveCount: number;
    neighborhoodCount: number;
  };
}

interface GetCityMapDataOptions {
  cityId?: string | null;
  citySlug?: string | null;
  publicOnly?: boolean;
  includeProposed?: boolean;
}

export async function getCityMapData({
  cityId,
  citySlug,
  publicOnly = false,
  includeProposed = false,
}: GetCityMapDataOptions): Promise<CityMapPayload | null> {
  const city = cityId
    ? await prisma.city.findUnique({ where: { id: cityId } })
    : await prisma.city.findUnique({ where: { slug: citySlug || 'austin-tx' } });

  if (!city) {
    return null;
  }

  const visibleStatuses = publicOnly
    ? ['APPROVED', 'IN_PROGRESS', 'COMPLETED']
    : includeProposed
      ? undefined
      : ['APPROVED', 'IN_PROGRESS', 'COMPLETED'];

  const neighborhoods = await prisma.neighborhood.findMany({
    where: { cityId: city.id },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
      interventions: {
        where: visibleStatuses ? { status: { in: visibleStatuses } } : undefined,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const cityAverageTemperature = neighborhoods.length
    ? neighborhoods.reduce((sum, neighborhood) => {
        const latestMeasurement = neighborhood.heatMeasurements[0];
        return sum + (latestMeasurement?.avgTempCelsius ?? 0);
      }, 0) / neighborhoods.length
    : 0;

  const mapNeighborhoods = neighborhoods.map((neighborhood, index) => {
    const latestMeasurement = neighborhood.heatMeasurements[0];
    const vulnerability = computeVulnerabilityScore(
      {
        id: neighborhood.id,
        name: neighborhood.name,
        population: neighborhood.population,
        areaSqkm: neighborhood.areaSqkm,
        medianIncome: neighborhood.medianIncome,
        pctElderly: neighborhood.pctElderly,
        pctChildren: neighborhood.pctChildren,
        avgTempCelsius: latestMeasurement?.avgTempCelsius,
        treeCanopyPct: latestMeasurement?.treeCanopyPct ?? undefined,
        imperviousSurfacePct: latestMeasurement?.imperviousSurfacePct ?? undefined,
      },
      cityAverageTemperature || latestMeasurement?.avgTempCelsius || 0
    );

    const geometry =
      parseBoundaryGeometry(neighborhood.boundary) ||
      createFallbackNeighborhoodGeometry(
        city.lat ?? 30.2672,
        city.lng ?? -97.7431,
        index,
        neighborhoods.length
      );

    return {
      id: neighborhood.id,
      name: neighborhood.name,
      population: neighborhood.population,
      avgTemp: latestMeasurement?.avgTempCelsius ?? null,
      maxTemp: latestMeasurement?.maxTempCelsius ?? null,
      treeCanopyPct: latestMeasurement?.treeCanopyPct ?? null,
      imperviousSurfacePct: latestMeasurement?.imperviousSurfacePct ?? null,
      vulnerabilityScore: vulnerability.score,
      vulnerabilityLevel: vulnerability.level,
      geometry,
      center: getGeometryCenter(geometry),
      interventions: neighborhood.interventions.map((intervention) => ({
        id: intervention.id,
        name: intervention.name,
        status: intervention.status,
        estimatedTempReductionC: intervention.estimatedTempReductionC,
      })),
    } satisfies CityMapNeighborhood;
  });

  const interventions = await prisma.intervention.findMany({
    where: {
      cityId: city.id,
      ...(visibleStatuses ? { status: { in: visibleStatuses } } : {}),
    },
    include: {
      neighborhood: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapInterventions = interventions
    .map((intervention) => {
      const matchingNeighborhood = mapNeighborhoods.find(
        (neighborhood) => neighborhood.id === intervention.neighborhoodId
      );
      const point = parseInterventionPoint(intervention.location) || matchingNeighborhood?.center;

      if (!point) {
        return null;
      }

      return {
        id: intervention.id,
        name: intervention.name,
        type: intervention.type,
        status: intervention.status,
        neighborhoodId: intervention.neighborhoodId,
        neighborhoodName: intervention.neighborhood?.name || null,
        estimatedTempReductionC: intervention.estimatedTempReductionC,
        estimatedCostUsd: intervention.estimatedCostUsd,
        point,
      } satisfies CityMapIntervention;
    })
    .filter((intervention): intervention is CityMapIntervention => intervention !== null);

  return {
    city: {
      id: city.id,
      name: city.name,
      slug: city.slug,
      lat: city.lat ?? 30.2672,
      lng: city.lng ?? -97.7431,
    },
    neighborhoods: mapNeighborhoods,
    interventions: mapInterventions,
    stats: {
      criticalCount: mapNeighborhoods.filter((neighborhood) => neighborhood.vulnerabilityLevel === 'CRITICAL').length,
      highCount: mapNeighborhoods.filter((neighborhood) => neighborhood.vulnerabilityLevel === 'HIGH').length,
      interventionCount: mapInterventions.length,
      approvedOrActiveCount: mapInterventions.filter((intervention) => intervention.status !== 'PROPOSED').length,
      neighborhoodCount: mapNeighborhoods.length,
    },
  };
}