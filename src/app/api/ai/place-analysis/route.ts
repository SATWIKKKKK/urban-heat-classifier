import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generatePlaceAnalysis, type PlaceAnalysisInput } from '@/lib/ai/placeAnalysis';

export const maxDuration = 120; // allow slow free-tier AI models

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: PlaceAnalysisInput = await request.json();

  if (!body.placeName || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: 'Missing required fields: placeName, lat, lng' }, { status: 400 });
  }

  try {
    const report = await generatePlaceAnalysis(body);
    return NextResponse.json({ report });
  } catch (err) {
    console.error('place-analysis route error:', err);
    return NextResponse.json({ error: 'Internal server error during analysis.' }, { status: 500 });
  }
}
