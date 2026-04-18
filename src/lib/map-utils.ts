type PolygonGeometry = {
  type: 'Polygon';
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: 'MultiPolygon';
  coordinates: number[][][][];
};

export type SupportedMapGeometry = PolygonGeometry | MultiPolygonGeometry;

export function parseBoundaryGeometry(boundary: string | null | undefined): SupportedMapGeometry | null {
  if (!boundary) {
    return null;
  }

  try {
    const parsed = JSON.parse(boundary) as SupportedMapGeometry;
    if (parsed?.type === 'Polygon' || parsed?.type === 'MultiPolygon') {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function createFallbackNeighborhoodGeometry(
  centerLat: number,
  centerLng: number,
  index: number,
  total: number
): PolygonGeometry {
  const gridSize = Math.max(2, Math.ceil(Math.sqrt(Math.max(total, 1))));
  const row = Math.floor(index / gridSize);
  const column = index % gridSize;
  const latStep = 0.018;
  const lngStep = 0.022;
  const startLat = centerLat - ((gridSize - 1) * latStep) / 2;
  const startLng = centerLng - ((gridSize - 1) * lngStep) / 2;
  const boxCenterLat = startLat + row * latStep;
  const boxCenterLng = startLng + column * lngStep;
  const halfLat = 0.007;
  const halfLng = 0.009;

  return {
    type: 'Polygon',
    coordinates: [[
      [boxCenterLng - halfLng, boxCenterLat - halfLat],
      [boxCenterLng + halfLng, boxCenterLat - halfLat],
      [boxCenterLng + halfLng, boxCenterLat + halfLat],
      [boxCenterLng - halfLng, boxCenterLat + halfLat],
      [boxCenterLng - halfLng, boxCenterLat - halfLat],
    ]],
  };
}

export function getGeometryCenter(geometry: SupportedMapGeometry): [number, number] {
  const points =
    geometry.type === 'Polygon'
      ? geometry.coordinates.flat()
      : geometry.coordinates.flat(2);

  if (!points.length) {
    return [30.2672, -97.7431];
  }

  const [lngSum, latSum] = points.reduce(
    (accumulator, [lng, lat]) => [accumulator[0] + lng, accumulator[1] + lat],
    [0, 0]
  );

  return [latSum / points.length, lngSum / points.length];
}

export function parseInterventionPoint(location: string | null | undefined): [number, number] | null {
  if (!location) {
    return null;
  }

  try {
    if (location.includes(',')) {
      const [lat, lng] = location.split(',').map((value) => Number.parseFloat(value.trim()));
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return [lat, lng];
      }
    }

    const parsed = JSON.parse(location) as
      | [number, number]
      | { coordinates?: [number, number] }
      | null;

    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [parsed[0], parsed[1]];
    }

    if (!Array.isArray(parsed) && parsed?.coordinates && parsed.coordinates.length >= 2) {
      return [parsed.coordinates[1], parsed.coordinates[0]];
    }
  } catch {
    return null;
  }

  return null;
}

export function getInterventionStatusColor(status: string) {
  switch (status) {
    case 'APPROVED':
      return '#3b82f6';
    case 'IN_PROGRESS':
      return '#f59e0b';
    case 'COMPLETED':
      return '#22c55e';
    default:
      return '#94a3b8';
  }
}