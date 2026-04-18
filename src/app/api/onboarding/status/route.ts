import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId');

    if (!cityId) {
      return NextResponse.json({ error: 'cityId required' }, { status: 400 });
    }

    const state = await prisma.onboardingState.findUnique({ where: { cityId } });
    if (!state) {
      return NextResponse.json({ isComplete: false });
    }

    return NextResponse.json({ isComplete: !!state.isComplete, state });
  } catch (err) {
    console.error('onboarding status error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
