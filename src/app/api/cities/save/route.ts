import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

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
    // Generate unique slug
    let slug = makeSlug(name);
    const existing = await prisma.city.findFirst({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const currency = CURRENCY_MAP[countryCode?.toLowerCase() ?? ''] ?? 'USD';

    // Create city, initial place, and update user in a transaction
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

      // Create initial onboarding state
      await tx.onboardingState.create({
        data: { cityId: city.id },
      });

      // Create initial place record (the city itself as a place)
      await tx.place.create({
        data: {
          cityId: city.id,
          name,
        },
      });

      // Update user to be CITY_ADMIN of this city
      const user = await tx.user.update({
        where: { id: session.user.id },
        data: {
          cityId: city.id,
          role: 'CITY_ADMIN',
        },
      });

      return { city, user };
    });

    return NextResponse.json({
      cityId: result.city.id,
      cityName: result.city.name,
      slug: result.city.slug,
    });
  } catch (err) {
    console.error('Failed to save city:', err);
    return NextResponse.json(
      { error: 'Failed to save city', details: String(err) },
      { status: 500 },
    );
  }
}
