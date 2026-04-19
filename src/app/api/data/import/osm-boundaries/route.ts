import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.cityId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const cityId = body.cityId || session.user.cityId;
  const cityName = body.cityName as string;
  const stateName = body.stateName as string | undefined;

  if (!cityName) {
    return NextResponse.json({ error: 'cityName is required' }, { status: 400 });
  }

  const query = `
[out:json][timeout:30];
area[name="${cityName.replace(/"/g, '')}"]->.city;
(
  relation["boundary"="administrative"]["admin_level"~"8|9|10"](area.city);
  way["place"~"neighbourhood|suburb|quarter"](area.city);
);
out geom;
`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Overpass API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const elements = data.elements || [];

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const element of elements) {
      const name =
        element.tags?.name || element.tags?.['name:en'] || null;
      if (!name) {
        failed++;
        continue;
      }

      let boundary: string | null = null;

      if (element.type === 'way' && element.geometry) {
        const coords = element.geometry.map(
          (p: { lon: number; lat: number }) => [p.lon, p.lat]
        );
        if (coords.length >= 3) {
          // Close the ring if not closed
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([...first]);
          }
          boundary = JSON.stringify({
            type: 'Polygon',
            coordinates: [coords],
          });
        }
      } else if (element.type === 'relation' && element.members) {
        const outerWays = element.members.filter(
          (m: { type: string; role: string; geometry?: unknown[] }) =>
            m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry
        );
        if (outerWays.length > 0) {
          const coords = outerWays[0].geometry.map(
            (p: { lon: number; lat: number }) => [p.lon, p.lat]
          );
          if (coords.length >= 3) {
            const first = coords[0];
            const last = coords[coords.length - 1];
            if (first[0] !== last[0] || first[1] !== last[1]) {
              coords.push([...first]);
            }
            boundary = JSON.stringify({
              type: 'Polygon',
              coordinates: [coords],
            });
          }
        }
      }

      if (!boundary) {
        failed++;
        continue;
      }

      try {
        const existing = await prisma.neighborhood.findUnique({
          where: { cityId_name: { cityId, name } },
        });

        if (existing) {
          await prisma.neighborhood.update({
            where: { id: existing.id },
            data: { boundary },
          });
          updated++;
        } else {
          await prisma.neighborhood.create({
            data: { cityId, name, boundary },
          });
          created++;
        }
      } catch {
        failed++;
      }
    }

    // Also geocode the city if lat/lng missing
    const city = await prisma.city.findUnique({ where: { id: cityId } });
    if (city && !city.lat && !city.lng) {
      const geoQuery = stateName
        ? `${cityName}, ${stateName}, India`
        : `${cityName}, India`;
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geoQuery)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'HeatPlan/1.0' } }
        );
        const geoData = await geoRes.json();
        if (geoData[0]) {
          await prisma.city.update({
            where: { id: cityId },
            data: {
              lat: parseFloat(geoData[0].lat),
              lng: parseFloat(geoData[0].lon),
            },
          });
        }
      } catch {
        // geocode failure is non-fatal
      }
    }

    return NextResponse.json({ created, updated, failed, total: elements.length });
  } catch (error) {
    console.error('OSM import error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Overpass API' },
      { status: 500 }
    );
  }
}
