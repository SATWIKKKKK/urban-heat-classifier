import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/db';

function slugifyCityName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function createUniqueCitySlug(cityName: string) {
  const baseSlug = slugifyCityName(cityName) || 'city';
  let slug = baseSlug;
  let attempt = 1;

  while (await prisma.city.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();

    if (!name || !normalizedEmail || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const cityName = `${String(name).trim().split(' ')[0] || 'My'}'s City`;
    const citySlug = await createUniqueCitySlug(cityName);

    const city = await prisma.city.create({
      data: {
        name: cityName,
        slug: citySlug,
        country: 'India',
        currency: 'INR',
      },
    });

    await prisma.onboardingState.create({
      data: {
        cityId: city.id,
        isComplete: true,
      },
    });

    // Create user directly as CITY_ADMIN and attach city.
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'CITY_ADMIN',
        cityId: city.id,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          resourceType: 'User',
          resourceId: user.id,
          afterValue: JSON.stringify({ email: normalizedEmail, role: 'CITY_ADMIN', cityId: city.id }),
        },
      });
    } catch {
      // non-critical
    }

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    if (error instanceof Error && error.message?.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A city with this name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Registration failed' },
      { status: 500 }
    );
  }
}
