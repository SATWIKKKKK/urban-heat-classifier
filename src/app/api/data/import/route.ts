import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.cityId) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { type, content, fileName, cityId } = body;

  if (!type || !content || !cityId) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }

  // Verify user has access to this city
  if (cityId !== session.user.cityId && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  try {
    if (type === 'csv') {
      return await handleCSVImport(content, cityId, fileName);
    } else if (type === 'geojson') {
      return await handleGeoJSONImport(content, cityId);
    } else if (type === 'weather') {
      return await handleWeatherImport(content, cityId);
    }

    return NextResponse.json({ message: 'Unknown import type' }, { status: 400 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ message: 'Import failed: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}

async function handleCSVImport(csvContent: string, cityId: string, fileName: string) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return NextResponse.json({ message: 'CSV must have header and at least one data row' }, { status: 400 });
  }

  const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  const nameIdx = header.indexOf('name');
  if (nameIdx === -1) {
    return NextResponse.json({ message: 'CSV must have a "name" column' }, { status: 400 });
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v: string) => v.trim());
    const name = values[nameIdx];
    if (!name) continue;

    const getVal = (col: string) => {
      const idx = header.indexOf(col);
      return idx >= 0 && values[idx] ? parseFloat(values[idx]) : undefined;
    };

    await prisma.neighborhood.upsert({
      where: { cityId_name: { cityId, name } },
      create: {
        cityId,
        name,
        population: getVal('population') ? Math.round(getVal('population')!) : undefined,
        areaSqkm: getVal('areasqkm'),
        medianIncome: getVal('medianincome'),
        pctElderly: getVal('pctelderly'),
        pctChildren: getVal('pctchildren'),
      },
      update: {
        population: getVal('population') ? Math.round(getVal('population')!) : undefined,
        areaSqkm: getVal('areasqkm'),
        medianIncome: getVal('medianincome'),
        pctElderly: getVal('pctelderly'),
        pctChildren: getVal('pctchildren'),
      },
    });
    imported++;
  }

  // Create ingestion log
  await prisma.dataIngestionJob.create({
    data: {
      cityId,
      dataType: 'CSV_NEIGHBORHOOD',
      status: 'COMPLETED',
      recordsProcessed: imported,
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ message: `Successfully imported ${imported} neighborhoods` });
}

async function handleGeoJSONImport(content: string, cityId: string) {
  const geojson = JSON.parse(content);
  if (!geojson.features || !Array.isArray(geojson.features)) {
    return NextResponse.json({ message: 'Invalid GeoJSON: must be a FeatureCollection' }, { status: 400 });
  }

  let updated = 0;
  for (const feature of geojson.features) {
    const name = feature.properties?.name;
    if (!name) continue;

    const geoStr = JSON.stringify(feature.geometry);

    const existing = await prisma.neighborhood.findFirst({ where: { cityId, name } });
    if (existing) {
      await prisma.neighborhood.update({
        where: { id: existing.id },
        data: { boundary: geoStr },
      });
      updated++;
    }
  }

  return NextResponse.json({ message: `Updated GeoJSON boundaries for ${updated} neighborhoods` });
}

async function handleWeatherImport(csvContent: string, cityId: string) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return NextResponse.json({ message: 'CSV must have header and at least one data row' }, { status: 400 });
  }

  const header = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
  let imported = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v: string) => v.trim());
    const getVal = (col: string) => {
      const idx = header.indexOf(col);
      return idx >= 0 && values[idx] ? values[idx] : undefined;
    };

    const stationId = getVal('stationid');
    const stationName = getVal('stationname') || `Station ${stationId}`;
    const lat = getVal('lat') ? parseFloat(getVal('lat')!) : undefined;
    const lng = getVal('lng') ? parseFloat(getVal('lng')!) : undefined;

    if (!stationId || lat === undefined || lng === undefined) continue;

    // Upsert weather station
    let station = await prisma.weatherStation.findFirst({ where: { cityId, name: stationName } });
    if (!station) {
      station = await prisma.weatherStation.create({
        data: { cityId, name: stationName, stationCode: stationId, latitude: lat, longitude: lng },
      });
    }

    const recordedAt = getVal('recordedat') ? new Date(getVal('recordedat')!) : new Date();
    const tempCelsius = getVal('tempcelsius') ? parseFloat(getVal('tempcelsius')!) : undefined;
    const humidity = getVal('humidity') ? parseFloat(getVal('humidity')!) : undefined;
    const windSpeed = getVal('windspeed') ? parseFloat(getVal('windspeed')!) : undefined;

    if (tempCelsius !== undefined) {
      await prisma.weatherReading.create({
        data: {
          stationId: station.id,
          recordedAt,
          tempCelsius,
          humidity,
          windSpeed,
        },
      });
      imported++;
    }
  }

  return NextResponse.json({ message: `Imported ${imported} weather readings` });
}
