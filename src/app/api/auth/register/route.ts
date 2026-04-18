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
    const { name, email, password, cityName, role: requestedRole } = await request.json();
    const normalizedEmail = String(email || '').toLowerCase().trim();

    const VALID_ROLES = [
      'CITY_ADMIN', 'MUNICIPAL_COMMISSIONER', 'WARD_OFFICER',
      'SDMA_OBSERVER', 'DATA_ANALYST', 'CITIZEN_REPORTER', 'NGO_FIELD_WORKER',
    ];
    const role = VALID_ROLES.includes(requestedRole) ? requestedRole : 'CITY_ADMIN';

    if (!name || !normalizedEmail || !password || !cityName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);
    const slug = await createUniqueCitySlug(cityName);

    // Create city and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const city = await tx.city.create({
        data: {
          name: cityName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          cityId: city.id,
          role,
        },
      });

      await tx.onboardingState.create({
        data: {
          cityId: city.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_REGISTERED',
          resourceType: 'User',
          resourceId: user.id,
          afterValue: JSON.stringify({ email: normalizedEmail, role, cityName }),
        },
      });

      return { user, city };
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      cityId: result.city.id,
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    // Check for unique constraint violation on slug
    if (error instanceof Error && error.message?.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'A city with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
