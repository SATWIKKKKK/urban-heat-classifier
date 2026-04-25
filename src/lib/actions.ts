'use server';

import { hash } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { computeVulnerabilityScore, computeAndStoreVulnerability } from '@/lib/compute/vulnerability';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateReportNarrative } from '@/lib/gemini';

// ── Place Actions ──

const addPlaceSchema = z.object({
  cityId: z.string().min(1),
  name: z.string().min(1).max(200),
  population: z.number().int().positive().optional(),
  areaSqkm: z.number().positive().optional(),
  medianIncome: z.number().positive().optional(),
  pctElderly: z.number().min(0).max(100).optional(),
  pctChildren: z.number().min(0).max(100).optional(),
  boundary: z.string().optional(),
});

export async function addPlaceAction(data: z.infer<typeof addPlaceSchema>) {
  const parsed = addPlaceSchema.parse(data);
  const place = await prisma.place.create({ data: parsed });
  await computeAndStoreVulnerability(place.id);
  revalidatePath('/dashboard/places');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/map');
  return place;
}

export async function updatePlaceAction(id: string, data: Partial<z.infer<typeof addPlaceSchema>>) {
  const place = await prisma.place.update({ where: { id }, data });
  await computeAndStoreVulnerability(id);
  revalidatePath(`/dashboard/places/${id}`);
  revalidatePath('/dashboard/places');
  revalidatePath('/map');
  return place;
}

export async function deletePlaceAction(id: string, cityId: string): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
  try {
    const place = await prisma.place.findUnique({ where: { id }, select: { id: true, cityId: true } });
    if (!place) return { success: false, error: 'Place not found' };
    if (place.cityId !== cityId) return { success: false, error: 'Forbidden' };
    await prisma.heatMeasurement.deleteMany({ where: { placeId: id } });
    await prisma.intervention.deleteMany({ where: { placeId: id } });
    await prisma.place.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_PLACE',
        resourceType: 'Place',
        resourceId: id,
      },
    });
    revalidatePath('/dashboard/mydata');
    revalidatePath('/dashboard/places');
    revalidatePath('/map');
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to delete place' };
  }
}

// ── Heat Measurement Actions ──

const addHeatMeasurementSchema = z.object({
  placeId: z.string().min(1),
  measurementDate: z.string().datetime(),
  avgTempCelsius: z.number(),
  maxTempCelsius: z.number(),
  minTempCelsius: z.number().optional(),
  treeCanopyPct: z.number().min(0).max(100).optional(),
  imperviousSurfacePct: z.number().min(0).max(100).optional(),
  dataSource: z.string().optional(),
});

export async function addHeatMeasurementAction(data: z.infer<typeof addHeatMeasurementSchema>) {
  const parsed = addHeatMeasurementSchema.parse(data);
  const measurement = await prisma.heatMeasurement.create({
    data: {
      ...parsed,
      measurementDate: new Date(parsed.measurementDate),
    },
  });
  await computeAndStoreVulnerability(parsed.placeId);
  revalidatePath(`/dashboard/places/${parsed.placeId}`);
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/map');
  revalidatePath('/dashboard/admin');
  return measurement;
}

// ── Intervention Actions ──

const addInterventionSchema = z.object({
  placeId: z.string().optional(),
  type: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  estimatedTempReductionC: z.number().optional(),
});

export async function addInterventionAction(data: z.input<typeof addInterventionSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  // Always look up the current user from DB — never trust the client-provided cityId,
  // because a stale JWT could carry an old cityId that no longer exists.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { cityId: true },
  });
  if (!dbUser?.cityId) throw new Error('No city assigned to your account');

  const parsed = addInterventionSchema.parse(data);
  const intervention = await prisma.intervention.create({
    data: {
      ...parsed,
      cityId: dbUser.cityId,
      proposedById: session.user.id,
      status: 'PROPOSED',
    },
  });
  revalidatePath('/map');
  revalidatePath('/dashboard/interventions');
  revalidatePath('/dashboard/scenarios');
  return intervention;
}

export async function updateInterventionStatusAction(id: string, status: string, userId: string) {
  const intervention = await prisma.intervention.update({
    where: { id },
    data: { status },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE_INTERVENTION_STATUS',
      resourceType: 'Intervention',
      resourceId: id,
      afterValue: JSON.stringify({ newStatus: status }),
    },
  });
  revalidatePath('/map');
  revalidatePath('/dashboard/interventions');
  revalidatePath('/dashboard/scenarios');
  return intervention;
}

// ── Scenario Actions ──

const addScenarioSchema = z.object({
  cityId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  status: z.string().optional().default('DRAFT'),
  createdById: z.string().min(1),
});

export async function addScenarioAction(data: z.input<typeof addScenarioSchema>) {
  const parsed = addScenarioSchema.parse(data);
  const scenario = await prisma.scenario.create({ data: parsed });
  revalidatePath('/dashboard/scenarios');
  return scenario;
}

export async function addScenarioInterventionAction(scenarioId: string, interventionId: string) {
  const link = await prisma.scenarioIntervention.create({
    data: { scenarioId, interventionId },
  });
  revalidatePath('/dashboard/scenarios');
  return link;
}

export async function submitScenarioAction(id: string, userId: string) {
  const scenario = await prisma.scenario.update({
    where: { id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'SUBMIT_SCENARIO',
      resourceType: 'Scenario',
      resourceId: id,
    },
  });
  revalidatePath('/dashboard/scenarios');
  revalidatePath('/dashboard/admin');
  return scenario;
}

export async function approveScenarioAction(id: string, userId: string) {
  // Find scenario and linked interventions
  const scenario = await prisma.scenario.findUnique({
    where: { id },
    include: { scenarioInterventions: true },
  });
  if (!scenario) throw new Error('Scenario not found');

  // Approve scenario and linked interventions in a transaction
  await prisma.$transaction(async (tx) => {
    await tx.scenario.update({
      where: { id },
      data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
    });

    const interventionIds = scenario.scenarioInterventions.map((si) => si.interventionId);
    for (const iid of interventionIds) {
      await tx.intervention.update({
        where: { id: iid },
        data: { status: 'APPROVED', approvedById: userId, approvedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'APPROVE_INTERVENTION',
          resourceType: 'Intervention',
          resourceId: iid,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: 'APPROVE_SCENARIO',
        resourceType: 'Scenario',
        resourceId: id,
      },
    });
  });

  revalidatePath('/dashboard/scenarios');
  revalidatePath('/map');
  revalidatePath('/dashboard/interventions');
  revalidatePath('/dashboard/admin');

  return prisma.scenario.findUnique({ where: { id } });
}

// ── Report Actions ──

const addReportSchema = z.object({
  cityId: z.string().min(1),
  scenarioId: z.string().optional(),
  title: z.string().min(1).max(200),
  type: z.string().min(1),
  generatedById: z.string().min(1),
  content: z.string().optional(),
  tone: z.string().optional(),
  status: z.string().optional().default('GENERATING'),
});

export async function generateReportAction(data: z.input<typeof addReportSchema>) {
  const parsed = addReportSchema.parse(data);

  // Create record with GENERATING status immediately
  const report = await prisma.report.create({
    data: {
      cityId: parsed.cityId,
      scenarioId: parsed.scenarioId,
      title: parsed.title,
      type: parsed.type,
      generatedById: parsed.generatedById,
      tone: parsed.tone,
      status: 'GENERATING',
    },
  });

  // ── Build Gemini narrative if a scenario is linked ──────────────────────
  let finalContent = parsed.content ?? '';

  if (parsed.scenarioId) {
    try {
      const scenario = await prisma.scenario.findUnique({
        where: { id: parsed.scenarioId },
        include: {
          city: true,
          scenarioInterventions: {
            include: { intervention: { include: { place: { select: { name: true } } } } },
          },
          simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
        },
      });

      if (scenario) {
        type SimSummary = {
          averageTempReductionCelsius?: number;
          livesProtectedPerSummer?: number;
          projectedCo2ReductionTons?: number;
          energySavingsKwhPerYear?: number;
          costBenefitRatio?: number;
        };
        type NeighResult = { place: string; reductionCelsius: number; livesSaved: number };

        const latestResult = scenario.simulationResults[0];
        let simSummary: SimSummary | null = null;
        let placeResults: NeighResult[] = [];
        try {
          if (latestResult?.outputSummary) simSummary = JSON.parse(latestResult.outputSummary) as SimSummary;
          if (latestResult?.placeResults) placeResults = JSON.parse(latestResult.placeResults) as NeighResult[];
        } catch { /* ignore */ }

        const tone = (parsed.tone ?? 'ACCESSIBLE') as 'ACCESSIBLE' | 'TECHNICAL' | 'EXECUTIVE';

        const narrative = await generateReportNarrative({
          scenarioName: scenario.name,
          cityName: scenario.city.name,
          cityState: scenario.city.state,
          description: scenario.description,
          budget: scenario.totalEstimatedCostUsd,
          livesProtected: simSummary?.livesProtectedPerSummer ?? scenario.totalProjectedLivesSaved,
          coolingCelsius: simSummary?.averageTempReductionCelsius ?? scenario.totalProjectedTempReductionC,
          co2Tons: simSummary?.projectedCo2ReductionTons ?? scenario.projectedCo2ReductionTons,
          energySavingsKwh: simSummary?.energySavingsKwhPerYear ?? null,
          costBenefitRatio: simSummary?.costBenefitRatio ?? null,
          priority: scenario.priority,
          tone,
          reportType: parsed.type,
          interventions: scenario.scenarioInterventions.map(({ intervention: inv }) => ({
            name: inv.name,
            type: inv.type,
            place: inv.place?.name ?? 'City-wide',
            cost: inv.estimatedCostUsd,
            coolingC: inv.estimatedTempReductionC,
            status: inv.status,
          })),
          placeResults: placeResults.length > 0 ? placeResults : undefined,
        });

        finalContent = [
          `=== EXECUTIVE SUMMARY ===`,
          narrative.executiveSummary,
          ``,
          `=== IMPACT ANALYSIS ===`,
          narrative.impactAnalysis,
          ``,
          `=== RECOMMENDATIONS ===`,
          narrative.recommendations,
        ].join('\n');
      }
    } catch (err) {
      console.error('[generateReportAction] Gemini error', err);
    }
  }

  if (!finalContent) {
    finalContent = `Report: ${parsed.title}\nType: ${parsed.type}\nGenerated: ${new Date().toLocaleDateString()}`;
  }

  // ── Finalise the report ────────────────────────────────────────────────────
  await prisma.report.update({
    where: { id: report.id },
    data: { status: 'COMPLETED', content: finalContent },
  });

  revalidatePath('/reports');
  revalidatePath('/dashboard/reports');
  return report;
}

// ── Data Ingestion Actions ──

export async function createDataIngestionJobAction(
  cityId: string,
  dataType: string,
  _recordCount: number
) {
  void _recordCount;
  const job = await prisma.dataIngestionJob.create({
    data: {
      cityId,
      dataType,
      status: 'PROCESSING',
      recordsProcessed: 0,
    },
  });
  return job;
}

export async function updateDataIngestionJobAction(id: string, processed: number, status: string, errors?: string) {
  const job = await prisma.dataIngestionJob.update({
    where: { id },
    data: {
      recordsProcessed: processed,
      status,
      errors,
      ...(status === 'COMPLETED' || status === 'FAILED' ? { completedAt: new Date() } : {}),
    },
  });
  revalidatePath('/dashboard/data');
  return job;
}

// ── Onboarding Actions ─

const updateCityProfileSchema = z.object({
  cityId: z.string().min(1),
  name: z.string().min(1).max(200),
  state: z.string().optional(),
  country: z.string().optional(),
  population: z.number().int().positive().optional(),
  areaSqkm: z.number().positive().optional(),
  timezone: z.string().optional(),
  boundary: z.string().optional(),
});

const inviteTeamMemberSchema = z.object({
  cityId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['URBAN_PLANNER', 'CITY_COUNCIL']),
  name: z.string().min(1).max(200).optional(),
});

function slugifyCityName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function createUniqueCitySlug(baseName: string, cityId: string) {
  const baseSlug = slugifyCityName(baseName) || 'city';
  let slug = baseSlug;
  let attempt = 1;

  while (
    await prisma.city.findFirst({
      where: {
        slug,
        NOT: { id: cityId },
      },
    })
  ) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  return slug;
}

export async function updateCityProfileAction(data: z.input<typeof updateCityProfileSchema>) {
  const parsed = updateCityProfileSchema.parse(data);
  const slug = await createUniqueCitySlug(parsed.name, parsed.cityId);

  const city = await prisma.city.update({
    where: { id: parsed.cityId },
    data: {
      name: parsed.name,
      slug,
      state: parsed.state || null,
      country: parsed.country || 'United States',
      population: parsed.population,
      areaSqkm: parsed.areaSqkm,
      timezone: parsed.timezone || null,
      boundary: parsed.boundary || null,
    },
  });

  await updateOnboardingAction(parsed.cityId, { step1City: true });
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/admin');
  revalidatePath('/map');
  return city;
}

export async function inviteTeamMemberAction(data: z.input<typeof inviteTeamMemberSchema>) {
  const parsed = inviteTeamMemberSchema.parse({
    ...data,
    email: data.email.toLowerCase().trim(),
  });

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existingUser && existingUser.cityId !== parsed.cityId) {
    throw new Error('This email already belongs to another city account.');
  }

  const tempPassword = `HeatPlan@${parsed.role === 'URBAN_PLANNER' ? 'Planner' : 'Council'}2026`;
  const passwordHash = await hash(tempPassword, 12);

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: parsed.name || existingUser.name,
          role: parsed.role,
          cityId: parsed.cityId,
          passwordHash,
          isLocked: false,
          lockedUntil: null,
          failedLogins: 0,
        },
      })
    : await prisma.user.create({
        data: {
          email: parsed.email,
          name: parsed.name || parsed.email.split('@')[0],
          role: parsed.role,
          cityId: parsed.cityId,
          passwordHash,
        },
      });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'INVITE_TEAM_MEMBER',
      resourceType: 'User',
      resourceId: user.id,
      afterValue: JSON.stringify({ email: parsed.email, role: parsed.role }),
    },
  });

  await updateOnboardingAction(parsed.cityId, { step4Team: true });
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/admin');

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    tempPassword,
  };
}

export async function completeOnboardingAction(cityId: string) {
  await updateOnboardingAction(cityId, {
    step1City: true,
    step2Neighbors: true,
    step3Heat: true,
    step4Team: true,
    step5Alerts: true,
    step6Complete: true,
    isComplete: true,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard/waiting');
  revalidatePath('/dashboard/admin');
}

export async function updateOnboardingAction(cityId: string, stepData: Record<string, boolean>) {
  const state = await prisma.onboardingState.findUnique({ where: { cityId } });
  if (!state) {
    await prisma.onboardingState.create({
      data: { cityId, ...stepData },
    });
  } else {
    await prisma.onboardingState.update({
      where: { cityId },
      data: stepData,
    });
  }
  revalidatePath('/dashboard/onboarding');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/waiting');
}

// ── Fetch helpers ──

export async function getPlaces(cityId: string) {
  return prisma.place.findMany({
    where: { cityId },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
      interventions: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getPlaceById(id: string) {
  return prisma.place.findUnique({
    where: { id },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 20 },
      interventions: { include: { proposedBy: { select: { name: true } } } },
    },
  });
}

export async function getScenarios(cityId: string) {
  return prisma.scenario.findMany({
    where: { cityId },
    include: {
      scenarioInterventions: { include: { intervention: true } },
      simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getInterventions(cityId: string) {
  return prisma.intervention.findMany({
    where: { cityId },
    include: {
      place: { select: { name: true } },
      proposedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getReports(cityId: string) {
  return prisma.report.findMany({
    where: { cityId },
    include: { generatedBy: { select: { name: true } } },
    orderBy: { generatedAt: 'desc' },
  });
}

export async function getDataIngestionJobs(cityId: string) {
  return prisma.dataIngestionJob.findMany({
    where: { cityId },
    orderBy: { startedAt: 'desc' },
  });
}

export async function getDashboardStats(cityId: string) {
  const [places, interventions, scenarios, reports] = await Promise.all([
    prisma.place.count({ where: { cityId } }),
    prisma.intervention.count({ where: { cityId } }),
    prisma.scenario.count({ where: { cityId } }),
    prisma.report.count({ where: { cityId } }),
  ]);
  
  const latestMeasurements = await prisma.heatMeasurement.findMany({
    where: { place: { cityId } },
    orderBy: { measurementDate: 'desc' },
    take: 10,
  });
  
  const avgTemp = latestMeasurements.length > 0
    ? latestMeasurements.reduce((sum, m) => sum + m.avgTempCelsius, 0) / latestMeasurements.length
    : 0;

  return { places, interventions, scenarios, reports, avgTemp };
}
