'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ── Neighborhood Actions ──

const addNeighborhoodSchema = z.object({
  cityId: z.string().min(1),
  name: z.string().min(1).max(200),
  population: z.number().int().positive().optional(),
  areaSqkm: z.number().positive().optional(),
  medianIncome: z.number().positive().optional(),
  pctElderly: z.number().min(0).max(100).optional(),
  pctChildren: z.number().min(0).max(100).optional(),
  boundary: z.string().optional(),
});

export async function addNeighborhoodAction(data: z.infer<typeof addNeighborhoodSchema>) {
  const parsed = addNeighborhoodSchema.parse(data);
  const neighborhood = await prisma.neighborhood.create({ data: parsed });
  revalidatePath('/dashboard/neighborhoods');
  return neighborhood;
}

export async function updateNeighborhoodAction(id: string, data: Partial<z.infer<typeof addNeighborhoodSchema>>) {
  const neighborhood = await prisma.neighborhood.update({ where: { id }, data });
  revalidatePath(`/dashboard/neighborhoods/${id}`);
  revalidatePath('/dashboard/neighborhoods');
  return neighborhood;
}

export async function deleteNeighborhoodAction(id: string) {
  await prisma.neighborhood.delete({ where: { id } });
  revalidatePath('/dashboard/neighborhoods');
}

// ── Heat Measurement Actions ──

const addHeatMeasurementSchema = z.object({
  neighborhoodId: z.string().min(1),
  measurementDate: z.string().datetime(),
  avgTempCelsius: z.number(),
  maxTempCelsius: z.number(),
  minTempCelsius: z.number().optional(),
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
  revalidatePath(`/dashboard/neighborhoods/${parsed.neighborhoodId}`);
  return measurement;
}

// ── Intervention Actions ──

const addInterventionSchema = z.object({
  cityId: z.string().min(1),
  neighborhoodId: z.string().optional(),
  type: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  estimatedCostUsd: z.number().positive().optional(),
  estimatedTempReductionC: z.number().optional(),
  status: z.string().optional().default('PROPOSED'),
  proposedById: z.string().min(1),
});

export async function addInterventionAction(data: z.input<typeof addInterventionSchema>) {
  const parsed = addInterventionSchema.parse(data);
  const intervention = await prisma.intervention.create({ data: parsed });
  revalidatePath('/map');
  revalidatePath('/dashboard/interventions');
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
  revalidatePath('/scenarios');
  return scenario;
}

export async function addScenarioInterventionAction(scenarioId: string, interventionId: string) {
  const link = await prisma.scenarioIntervention.create({
    data: { scenarioId, interventionId },
  });
  revalidatePath('/scenarios');
  return link;
}

export async function approveScenarioAction(id: string, userId: string) {
  const scenario = await prisma.scenario.update({
    where: { id },
    data: { status: 'APPROVED' },
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'APPROVE_SCENARIO',
      resourceType: 'Scenario',
      resourceId: id,
    },
  });
  revalidatePath('/scenarios');
  return scenario;
}

// ── Report Actions ──

const addReportSchema = z.object({
  cityId: z.string().min(1),
  title: z.string().min(1).max(200),
  type: z.string().min(1),
  generatedById: z.string().min(1),
  content: z.string().optional(),
  status: z.string().optional().default('GENERATING'),
});

export async function generateReportAction(data: z.input<typeof addReportSchema>) {
  const parsed = addReportSchema.parse(data);
  const report = await prisma.report.create({ data: parsed });
  
  // Simulate report generation
  await prisma.report.update({
    where: { id: report.id },
    data: { status: 'COMPLETED', content: `Auto-generated ${parsed.type} report for ${parsed.title}` },
  });
  
  revalidatePath('/reports');
  return report;
}

// ── Data Ingestion Actions ──

export async function createDataIngestionJobAction(
  cityId: string,
  dataType: string,
  recordCount: number
) {
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
}

// ── Fetch helpers ──

export async function getNeighborhoods(cityId: string) {
  return prisma.neighborhood.findMany({
    where: { cityId },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
      interventions: true,
    },
    orderBy: { name: 'asc' },
  });
}

export async function getNeighborhoodById(id: string) {
  return prisma.neighborhood.findUnique({
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
      neighborhood: { select: { name: true } },
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
  const [neighborhoods, interventions, scenarios, reports] = await Promise.all([
    prisma.neighborhood.count({ where: { cityId } }),
    prisma.intervention.count({ where: { cityId } }),
    prisma.scenario.count({ where: { cityId } }),
    prisma.report.count({ where: { cityId } }),
  ]);
  
  const latestMeasurements = await prisma.heatMeasurement.findMany({
    where: { neighborhood: { cityId } },
    orderBy: { measurementDate: 'desc' },
    take: 10,
  });
  
  const avgTemp = latestMeasurements.length > 0
    ? latestMeasurements.reduce((sum, m) => sum + m.avgTempCelsius, 0) / latestMeasurements.length
    : 0;

  return { neighborhoods, interventions, scenarios, reports, avgTemp };
}
