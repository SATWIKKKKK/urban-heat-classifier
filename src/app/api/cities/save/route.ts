import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';
import { revalidatePath } from 'next/cache';

const CURRENCY_MAP: Record<string, string> = {
  in: 'INR', us: 'USD', gb: 'GBP', eu: 'EUR', jp: 'JPY', cn: 'CNY',
  au: 'AUD', ca: 'CAD', ch: 'CHF', kr: 'KRW', br: 'BRL', mx: 'MXN',
  ru: 'RUB', za: 'ZAR', ng: 'NGN', eg: 'EGP', pk: 'PKR', bd: 'BDT',
  id: 'IDR', my: 'MYR', th: 'THB', ph: 'PHP', vn: 'VND', tr: 'TRY',
  ae: 'AED', sa: 'SAR', ar: 'ARS', co: 'COP', cl: 'CLP', pe: 'PEN',
  ke: 'KES', gh: 'GHS', et: 'ETB', tz: 'TZS', ug: 'UGX',
};

function makeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function createPointBoundary(lat: number, lng: number, delta = 0.01): string {
  return JSON.stringify({
    type: 'Polygon',
    coordinates: [[
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ]],
  });
}

// POST /api/cities/save
// Body: { name, country, countryCode, lat, lng, displayName }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    name?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lng?: number;
    displayName?: string;
  };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, country, countryCode, lat, lng } = body;

  if (!name || !lat || !lng) {
    return NextResponse.json({ error: 'name, lat, and lng are required' }, { status: 400 });
  }

  try {
    if (session.user.cityId) {
      const boundary = createPointBoundary(lat, lng);

      const place = await prisma.$transaction(async (tx) => {
        const existingPlace = await tx.place.findUnique({
          where: {
            cityId_name: {
              cityId: session.user.cityId!,
              name,
            },
          },
        });

        if (existingPlace) {
          return tx.place.update({
            where: { id: existingPlace.id },
            data: {
              boundary: existingPlace.boundary ?? boundary,
              isActive: true,
            },
          });
        }

        return tx.place.create({
          data: {
            cityId: session.user.cityId!,
            name,
            boundary,
            isActive: true,
          },
        });
      });

      revalidatePath('/dashboard/map');
      revalidatePath('/dashboard/mydata');
      revalidatePath('/dashboard/places');

      return NextResponse.json({
        cityId: session.user.cityId,
        placeId: place.id,
        placeName: place.name,
        preservedCityContext: true,
      });
    }

    let slug = makeSlug(name);
    const existing = await prisma.city.findFirst({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const currency = CURRENCY_MAP[countryCode?.toLowerCase() ?? ''] ?? 'USD';
    const boundary = createPointBoundary(lat, lng);

    const result = await prisma.$transaction(async (tx) => {
      const city = await tx.city.create({
        data: {
          name,
          slug,
          country: country ?? 'Unknown',
          currency,
          lat,
          lng,
          isActive: true,
        },
      });

      await tx.onboardingState.create({
        data: { cityId: city.id },
      });

      const place = await tx.place.create({
        data: {
          cityId: city.id,
          name,
          boundary,
          isActive: true,
        },
      });

      await tx.user.update({
        where: { id: session.user.id },
        data: {
          cityId: city.id,
          role: 'CITY_ADMIN',
        },
      });

      return { city, place };
    });

    revalidatePath('/dashboard/map');
    revalidatePath('/dashboard/mydata');

    return NextResponse.json({
      cityId: result.city.id,
      cityName: result.city.name,
      slug: result.city.slug,
      placeId: result.place.id,
      placeName: result.place.name,
      preservedCityContext: false,
    });
  } catch (err) {
    console.error('Failed to save city:', err);
    return NextResponse.json(
      { error: 'Failed to save city', details: String(err) },
      { status: 500 },
    );
  }
}
