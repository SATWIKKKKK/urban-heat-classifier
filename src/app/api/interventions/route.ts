import { NextResponse } from 'next/server';
import { interventions } from '@/lib/data/seed';

export async function GET() {
  return NextResponse.json({ interventions });
}
