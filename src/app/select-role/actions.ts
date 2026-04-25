'use server';

import { auth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function selectRoleAction(role: 'CITY_ADMIN' | 'RESIDENT') {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const userId = session.user.id;

  try {
    if (role === 'CITY_ADMIN') {
      const citySlug = `city-${userId.substring(0, 8)}-${Date.now()}`;

      const city = await prisma.city.create({
        data: {
          name: 'My City',
          slug: citySlug,
          country: 'India',
          currency: 'INR',
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'CITY_ADMIN',
          cityId: city.id,
        },
      });

      await prisma.onboardingState.create({
        data: {
          cityId: city.id,
          isComplete: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'RESIDENT',
        },
      });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ROLE_SELECTED',
          resourceType: 'User',
          afterValue: JSON.stringify({ role }),
        },
      });
    } catch {
      // Audit log failure is non-critical
    }

    return { success: true, role };
  } catch (error) {
    console.error('selectRoleAction error:', error);
    return { error: 'Failed to set role. Please try again.' };
  }
}
