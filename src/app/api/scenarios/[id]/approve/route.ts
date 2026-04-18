import { NextResponse } from 'next/server';
import { approveScenarioAction } from '@/lib/actions';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // expected: ['api','scenarios','{id}','approve']
    const id = parts[2];
    const body = await request.json();
    const userId = body?.userId;
    if (!id || !userId) return NextResponse.json({ error: 'id and userId required' }, { status: 400 });

    const scenario = await approveScenarioAction(id, userId);
    return NextResponse.json({ scenario });
  } catch (err) {
    console.error('approve scenario error', err);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
