import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Suspense } from 'react';
import MyDataClient from './MyDataClient';

export default async function MyDataPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const cityId = session.user.cityId;

  if (!cityId) redirect('/dashboard');
  
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: {
      users: { select: { id: true, name: true, role: true } },
      onboardingState: true,
    },
  });

  if (!city) redirect('/dashboard');

  const places = await prisma.place.findMany({
    where: { cityId },
    include: {
      heatMeasurements: { orderBy: { measurementDate: 'desc' }, take: 10 },
      interventions: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { name: 'asc' },
  });

  const scenarios = await prisma.scenario.findMany({
    where: { cityId },
    include: {
      simulationResults: { orderBy: { runAt: 'desc' }, take: 1 },
      scenarioInterventions: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Compute stats
  const totalPlaces = places.length;
  const totalMeasurements = places.reduce((s, p) => s + p.heatMeasurements.length, 0);
  const activeInterventions = places.reduce(
    (s, p) => s + p.interventions.filter((i) => i.status === 'APPROVED' || i.status === 'IN_PROGRESS').length,
    0
  );
  const completedInterventions = places.reduce(
    (s, p) => s + p.interventions.filter((i) => i.status === 'COMPLETED').length,
    0
  );
  const totalProjectedReduction = places.reduce(
    (s, p) =>
      s +
      p.interventions
        .filter((i) => i.status === 'APPROVED' || i.status === 'IN_PROGRESS')
        .reduce((s2, i) => s2 + (i.estimatedTempReductionC ?? 0), 0),
    0
  );

  // Data completeness
  const completenessItems = places.map((p) => {
    const checks = {
      hasCoordinates: !!(city.lat && city.lng),
      hasBoundary: !!p.boundary,
      hasHeatData: p.heatMeasurements.length > 0,
      hasTreeCanopy: p.heatMeasurements.some((m) => m.treeCanopyPct != null),
    };
    const total = Object.keys(checks).length;
    const done = Object.values(checks).filter(Boolean).length;
    return { placeId: p.id, placeName: p.name, checks, pct: Math.round((done / total) * 100) };
  });

  const overallCompleteness =
    completenessItems.length > 0
      ? Math.round(completenessItems.reduce((s, c) => s + c.pct, 0) / completenessItems.length)
      : 0;

  return (
    <Suspense fallback={<MyDataSkeleton />}>
      <MyDataClient
        city={{
          id: city.id,
          name: city.name,
          state: city.state,
          country: city.country,
          population: city.population,
          areaSqkm: city.areaSqkm,
          lat: city.lat,
          lng: city.lng,
          timezone: city.timezone,
          currency: city.currency,
          updatedAt: city.updatedAt.toISOString(),
        }}
        places={places.map((p) => ({
          id: p.id,
          name: p.name,
          population: p.population,
          areaSqkm: p.areaSqkm,
          medianIncome: p.medianIncome,
          pctElderly: p.pctElderly,
          pctChildren: p.pctChildren,
          vulnerabilityScore: p.vulnerabilityScore,
          vulnerabilityLevel: p.vulnerabilityLevel,
          boundary: !!p.boundary,
          heatMeasurements: p.heatMeasurements.map((m) => ({
            id: m.id,
            date: m.measurementDate.toISOString(),
            avgTemp: m.avgTempCelsius,
            maxTemp: m.maxTempCelsius,
            minTemp: m.minTempCelsius,
            treeCanopyPct: m.treeCanopyPct,
            imperviousSurfacePct: m.imperviousSurfacePct,
            dataSource: m.dataSource,
          })),
          interventions: p.interventions.map((i) => ({
            id: i.id,
            name: i.name,
            type: i.type,
            status: i.status,
            estimatedTempReductionC: i.estimatedTempReductionC,
          })),
        }))}
        stats={{
          totalPlaces,
          totalMeasurements,
          activeInterventions,
          completedInterventions,
          totalProjectedReduction,
        }}
        completeness={{ items: completenessItems, overall: overallCompleteness }}
        teamCount={city.users.length}
        scenarios={scenarios.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          interventionCount: s.scenarioInterventions.length,
          createdAt: s.createdAt.toISOString(),
        }))}
        userId={userId}
        cityId={cityId}
      />
    </Suspense>
  );
}

function MyDataSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="flex justify-between items-end pb-[24px] border-b border-[var(--border)] mb-[24px]">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-16 rounded bg-[var(--bg-elevated)]" />
          <div className="h-8 w-48 rounded bg-[var(--bg-elevated)]" />
          <div className="h-4 w-32 rounded bg-[var(--bg-elevated)]" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-[var(--bg-elevated)]" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-[16px] bg-[var(--bg-elevated)]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2">
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
           {[1, 2, 3, 4].map((i) => (
             <div key={i} className="h-64 rounded-[16px] bg-[var(--bg-elevated)]" />
           ))}
        </div>
        <div className="lg:col-span-4 flex flex-col gap-5">
           <div className="h-48 rounded-[16px] bg-[var(--bg-elevated)]" />
           <div className="h-64 rounded-[16px] bg-[var(--bg-elevated)]" />
        </div>
      </div>
    </div>
  );
}
