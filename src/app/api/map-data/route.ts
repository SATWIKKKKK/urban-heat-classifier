import { NextResponse } from 'next/server';
import { getCityMapData } from '@/lib/map-data';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cityId = url.searchParams.get('cityId');
    const citySlug = url.searchParams.get('citySlug');
    const publicOnly = url.searchParams.get('public') === 'true';
    const includeProposed = url.searchParams.get('includeProposed') === 'true';

    const payload = await getCityMapData({
      cityId,
      citySlug,
      publicOnly,
      includeProposed,
    });

    if (!payload) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('map data error', error);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}