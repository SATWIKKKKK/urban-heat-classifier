import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateDualScenarioReport, type DualScenarioInput } from '@/lib/ai/scenarioReport';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: DualScenarioInput = await request.json();

  if (!body.cityName || !body.scenarioA || !body.scenarioB) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const report = await generateDualScenarioReport(body);
  return NextResponse.json({ report });
}
