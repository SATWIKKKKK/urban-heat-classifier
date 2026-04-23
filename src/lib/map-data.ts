import prisma from '@/lib/db';
import { computeVulnerabilityScore, type VulnerabilityResult } from '@/lib/compute/vulnerability';
import {
  createFallbackPlaceGeometry,
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
  placeId: string | null;
  placeName: string | null;
  estimatedTempReductionC: number | null;
  estimatedCostUsd: number | null;
  point: [number, number];
}

export interface CityMapPlace {
  id: string;
  name: string;
  population: number | null;
  avgTemp: number | null;
  maxTemp: number | null;
  treeCanopyPct: number | null;
  imperviousSurfacePct: number | null;
  vulnerabilityScore: number;
  vulnerabilityLevel: VulnerabilityResult['level'];
  hasBoundary: boolean;
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
  places: CityMapPlace[];
  interventions: CityMapIntervention[];
  stats: {
    criticalCount: number;
    highCount: number;
    interventionCount: number;
    approvedOrActiveCount: number;
    placeCount: number;
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
    : citySlug
      ? await prisma.city.findUnique({ where: { slug: citySlug } })
      : null;

  if (!city) {
    return null;
  }

  const visibleStatuses = publicOnly
    ? ['APPROVED', 'IN_PROGRESS', 'COMPLETED']
    : includeProposed
      ? undefined
      : ['APPROVED', 'IN_PROGRESS', 'COMPLETED'];

  const places = await prisma.place.findMany({
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

  const cityAverageTemperature = places.length
    ? places.reduce((sum, place) => {
        const latestMeasurement = place.heatMeasurements[0];
        return sum + (latestMeasurement?.avgTempCelsius ?? 0);
      }, 0) / places.length
    : 0;

  const mapPlaces = places.map((place, index) => {
    const latestMeasurement = place.heatMeasurements[0];
    const vulnerability = computeVulnerabilityScore(
      {
        id: place.id,
        name: place.name,
        population: place.population,
        areaSqkm: place.areaSqkm,
        medianIncome: place.medianIncome,
        pctElderly: place.pctElderly,
        pctChildren: place.pctChildren,
        avgTempCelsius: latestMeasurement?.avgTempCelsius,
        treeCanopyPct: latestMeasurement?.treeCanopyPct ?? undefined,
        imperviousSurfacePct: latestMeasurement?.imperviousSurfacePct ?? undefined,
      },
      cityAverageTemperature || latestMeasurement?.avgTempCelsius || 0
    );

    const parsedBoundary = parseBoundaryGeometry(place.boundary);
    const geometry =
      parsedBoundary ||
      createFallbackPlaceGeometry(
        city.lat ?? 20.5937,
        city.lng ?? 78.9629,
        index,
        places.length
      );

    return {
      id: place.id,
      name: place.name,
      population: place.population,
      avgTemp: latestMeasurement?.avgTempCelsius ?? null,
      maxTemp: latestMeasurement?.maxTempCelsius ?? null,
      treeCanopyPct: latestMeasurement?.treeCanopyPct ?? null,
      imperviousSurfacePct: latestMeasurement?.imperviousSurfacePct ?? null,
      vulnerabilityScore: vulnerability.score,
      vulnerabilityLevel: vulnerability.level,
      hasBoundary: parsedBoundary !== null,
      geometry,
      center: getGeometryCenter(geometry),
      interventions: place.interventions.map((intervention) => ({
        id: intervention.id,
        name: intervention.name,
        status: intervention.status,
        estimatedTempReductionC: intervention.estimatedTempReductionC,
      })),
    } satisfies CityMapPlace;
  });

  const interventions = await prisma.intervention.findMany({
    where: {
      cityId: city.id,
      ...(visibleStatuses ? { status: { in: visibleStatuses } } : {}),
    },
    include: {
      place: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const mapInterventions = interventions
    .map((intervention) => {
      const matchingPlace = mapPlaces.find(
        (place) => place.id === intervention.placeId
      );
      const point = parseInterventionPoint(intervention.location) || matchingPlace?.center;

      if (!point) {
        return null;
      }

      return {
        id: intervention.id,
        name: intervention.name,
        type: intervention.type,
        status: intervention.status,
        placeId: intervention.placeId,
        placeName: intervention.place?.name || null,
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
      lat: city.lat ?? 20.5937,
      lng: city.lng ?? 78.9629,
    },
    places: mapPlaces,
    interventions: mapInterventions,
    stats: {
      criticalCount: mapPlaces.filter((place) => place.vulnerabilityLevel === 'CRITICAL').length,
      highCount: mapPlaces.filter((place) => place.vulnerabilityLevel === 'HIGH').length,
      interventionCount: mapInterventions.length,
      approvedOrActiveCount: mapInterventions.filter((intervention) => intervention.status !== 'PROPOSED').length,
      placeCount: mapPlaces.length,
    },
  };
}