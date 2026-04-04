import { NextResponse } from 'next/server';
import { cityZones } from '@/lib/data/seed';

export async function GET() {
  return NextResponse.json({ zones: cityZones });
}
