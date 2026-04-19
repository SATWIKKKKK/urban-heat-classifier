import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generatePlaceAnalysis, type PlaceAnalysisInput } from '@/lib/ai/placeAnalysis';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: PlaceAnalysisInput = await request.json();

  if (!body.placeName || body.lat == null || body.lng == null) {
    return NextResponse.json({ error: 'Missing required fields: placeName, lat, lng' }, { status: 400 });
  }

  const report = await generatePlaceAnalysis(body);
  return NextResponse.json({ report });
}
