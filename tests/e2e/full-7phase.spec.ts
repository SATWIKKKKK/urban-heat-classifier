import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { prisma } from '../../src/lib/db';

type PublicIntervention = {
  id: string;
};

test.describe('Full 7-phase workflow (API-driven)', () => {
  test.setTimeout(120000);

  test('complete end-to-end journey using API + DB setup', async ({ request }) => {
    // Phase 1/2: Ensure city and admin exist (seed or create)
    let city = await prisma.city.findUnique({ where: { slug: 'austin-tx' } });
    if (!city) {
      city = await prisma.city.create({ data: { name: 'Austin', slug: 'austin-tx' } });
    }

    let admin = await prisma.user.findUnique({ where: { email: 'admin@heatplan.io' } });
    if (!admin) {
      admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin@heatplan.io' } });
    }

    // Phase 3: Pick up to 3 interventions to include in a scenario
    const interventions = await prisma.intervention.findMany({ where: { cityId: city.id }, take: 3 });
    expect(interventions.length).toBeGreaterThan(0);

    // Create scenario via API
    const createResp = await request.post('/api/scenarios', {
      data: {
        cityId: city.id,
        name: 'E2E Full Workflow Scenario',
        description: 'Automated test scenario',
        createdById: admin.id,
        interventionIds: interventions.map((i) => i.id),
      },
    });
    expect(createResp.ok()).toBeTruthy();
    const createBody = await createResp.json();
    const scenarioId = createBody?.scenario?.id;
    expect(scenarioId).toBeTruthy();

    // Submit the scenario
    const submitResp = await request.post(`/api/scenarios/${scenarioId}/submit`, {
      data: { userId: admin.id },
    });
    expect(submitResp.ok()).toBeTruthy();

    // Run the simulation endpoint (best-effort smoke) to validate engine
    const simResp = await request.get('/api/simulations');
    expect(simResp.ok()).toBeTruthy();
    const simBody = await simResp.json();
    expect(simBody.simulations).toBeDefined();

    // Approve the scenario
    const approveResp = await request.post(`/api/scenarios/${scenarioId}/approve`, {
      data: { userId: admin.id },
    });
    expect(approveResp.ok()).toBeTruthy();
    const approveBody = await approveResp.json();
    expect(approveBody?.scenario?.status).toBe('APPROVED');

    // Phase 4/6: Verify interventions show up in public interventions (approved/in-progress/completed)
    const publicInterventionsResp = await request.get('/api/public/austin-tx/interventions');
    expect(publicInterventionsResp.ok()).toBeTruthy();
    const publicInterventions = (await publicInterventionsResp.json()) as PublicIntervention[];
    // At least one of the interventions we approved should be present in public list
    const approvedIds = interventions.map((i) => i.id);
    const found = publicInterventions.some((intervention) => approvedIds.includes(intervention.id));
    expect(found).toBeTruthy();

    // Phase 5/7: Fetch scenarios for city and check counts + admin visibility via API
    const scenariosResp = await request.get(`/api/scenarios?cityId=${city.id}`);
    expect(scenariosResp.ok()).toBeTruthy();
    const scenariosBody = await scenariosResp.json();
    expect(Array.isArray(scenariosBody.scenarios)).toBeTruthy();

    // Clean up: optional (leave records for manual inspection); do not delete by default.
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });
});
