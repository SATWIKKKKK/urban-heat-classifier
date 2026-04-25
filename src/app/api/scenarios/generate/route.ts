import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateScenarios,
  type ScenarioGenerationInput,
  getCurrency,
} from '@/lib/ai/scenarioGeneration';

export const maxDuration = 120; // seconds — allow slow free-tier AI models

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user in the DB (the JWT might reference a stale/deleted user ID).
    // Always resolve the real DB user to prevent FK violations.
    let resolvedUserId = session.user.id;
    {
      const dbUser = await prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true },
      });
      if (!dbUser) {
        // Session token has a stale user ID (e.g. after a DB reseed). Try by email.
        const email = session.user.email?.toLowerCase().trim();
        if (email) {
          const userByEmail = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          });
          if (userByEmail) {
            resolvedUserId = userByEmail.id;
          } else {
            return NextResponse.json({ error: 'User account not found. Please sign in again.' }, { status: 401 });
          }
        } else {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }
    }

    const body = await request.json();
    const {
      placeId,
      placeName,
      cityName,
      stateName,
      countryName,
      countryCode,
      latitude,
      longitude,
      population,
      baselineTempC,
      treeCanopyPct,
      imperviousSurfacePct,
      vulnerabilityScore,
      vulnerabilityLevel,
      selectedStrategies,
      budgetLocal,
      timelineMonths,
      priority,
      currentTempC,
      currentHumidity,
      todayMaxC,
    } = body as ScenarioGenerationInput & { placeId?: string; cityId?: string };

    if (!placeName || !cityName || !countryName || !countryCode) {
      return NextResponse.json(
        { error: 'placeName, cityName, countryName, countryCode are required' },
        { status: 400 },
      );
    }
    if (!selectedStrategies?.length) {
      return NextResponse.json(
        { error: 'At least one strategy must be selected' },
        { status: 400 },
      );
    }

    const requestedCityId = body.cityId as string | undefined;

    // Resolve city from the selected place first, then from a validated cityId,
    // then by city/state/country name, and finally create it if needed.
    let cityId: string | undefined;

    if (placeId) {
      const place = await prisma.place.findUnique({
        where: { id: placeId },
        select: { cityId: true },
      });
      cityId = place?.cityId;
    }

    if (!cityId && requestedCityId) {
      const suppliedCity = await prisma.city.findUnique({
        where: { id: requestedCityId },
        select: { id: true, name: true, state: true, country: true },
      });

      const matchesRequestedCity =
        suppliedCity &&
        suppliedCity.name.localeCompare(cityName, undefined, { sensitivity: 'accent' }) === 0 &&
        (!stateName || (suppliedCity.state?.localeCompare(stateName, undefined, { sensitivity: 'accent' }) === 0)) &&
        suppliedCity.country.localeCompare(countryName, undefined, { sensitivity: 'accent' }) === 0;

      if (matchesRequestedCity) {
        cityId = suppliedCity.id;
      }
    }

    if (!cityId) {
      const city = await prisma.city.findFirst({
        where: {
          name: { equals: cityName, mode: 'insensitive' },
          country: { equals: countryName, mode: 'insensitive' },
          ...(stateName ? { state: { equals: stateName, mode: 'insensitive' } } : {}),
        },
        select: { id: true },
      });
      cityId = city?.id;
    }

    // If no city in DB, create one
    if (!cityId) {
      const slug = cityName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const city = await prisma.city.create({
        data: {
          name: cityName,
          slug: slug || 'city',
          state: stateName ?? null,
          country: countryName,
          lat: latitude,
          lng: longitude,
        },
      });
      cityId = city.id;
    }

    // Generate scenarios via Gemini
    const result = await generateScenarios({
      placeName,
      cityName,
      stateName,
      countryName,
      countryCode,
      latitude,
      longitude,
      population,
      baselineTempC,
      treeCanopyPct,
      imperviousSurfacePct,
      vulnerabilityScore,
      vulnerabilityLevel,
      selectedStrategies,
      budgetLocal,
      timelineMonths,
      priority,
      currentTempC,
      currentHumidity,
      todayMaxC,
    });

    const currency = getCurrency(countryCode);

    // Save scenario to DB
    const savedScenarios = [];
    for (const [key, scenario] of Object.entries({
      scenarioA: result.scenarioA,
    })) {
      // Create the scenario
      const dbScenario = await prisma.scenario.create({
        data: {
          cityId: cityId!,
          name: scenario.name,
          description: scenario.description,
          status: 'DRAFT',
          priority: priority ?? 'HEALTH',
          totalEstimatedCostUsd: scenario.totalCostLocal,
          totalProjectedTempReductionC: scenario.projectedTempReductionC,
          totalProjectedLivesSaved: Math.round(scenario.projectedLivesSaved),
          projectedCo2ReductionTons: scenario.projectedCo2ReductionTons,
          createdById: resolvedUserId,
        },
      });

      // Create interventions for each strategy and link them
      for (const strategy of scenario.strategies) {
        const intervention = await prisma.intervention.create({
          data: {
            cityId: cityId!,
            placeId: placeId ?? null,
            type: strategy.type,
            name: strategy.name,
            description: strategy.description,
            status: 'PROPOSED',
            estimatedCostUsd: strategy.totalCostLocal,
            estimatedTempReductionC: strategy.tempReductionC,
            parameters: JSON.stringify({
              quantity: strategy.quantity,
              unitCostLocal: strategy.unitCostLocal,
              co2ReductionTons: strategy.co2ReductionTons,
              placementNotes: strategy.placementNotes,
              currencyCode: currency.code,
              currencySymbol: currency.symbol,
            }),
            proposedById: resolvedUserId,
          },
        });

        await prisma.scenarioIntervention.create({
          data: {
            scenarioId: dbScenario.id,
            interventionId: intervention.id,
          },
        });
      }

      // Create simulation result
      const simResult = await prisma.simulationResult.create({
        data: {
          scenarioId: dbScenario.id,
          inputState: JSON.stringify({
            placeName,
            cityName,
            countryCode,
            selectedStrategies,
            budgetLocal,
            timelineMonths,
            priority,
          }),
          outputSummary: JSON.stringify({
            tempReductionC: scenario.projectedTempReductionC,
            livesSaved: scenario.projectedLivesSaved,
            co2ReductionTons: scenario.projectedCo2ReductionTons,
            energySavingsKwh: scenario.projectedEnergySavingsKwh,
            costBenefitRatio: scenario.costBenefitRatio,
            totalCostLocal: scenario.totalCostLocal,
            currencyCode: currency.code,
          }),
          modelVersion: 'gemini-2.0-flash',
        },
      });

      // FIX 1: Create HeatMeasurement if none exist for place
      if (placeId) {
        const existingMeasurements = await prisma.heatMeasurement.count({
          where: { placeId }
        });
        
        if (existingMeasurements === 0) {
          await prisma.heatMeasurement.create({
            data: {
              placeId,
              measurementDate: new Date(),
              avgTempCelsius: currentTempC ?? 30, // Use fallback if not provided
              maxTempCelsius: todayMaxC ?? null,
              treeCanopyPct: treeCanopyPct ?? null,
              imperviousSurfacePct: imperviousSurfacePct ?? null,
              dataSource: 'SCENARIO_ESTIMATE',
            }
          });
        }
        
        // Update vulnerability
        const { computeAndStoreVulnerability } = await import('@/lib/compute/vulnerability');
        await computeAndStoreVulnerability(placeId);
      }

      // Create report
      await prisma.report.create({
        data: {
          cityId: cityId!,
          scenarioId: dbScenario.id,
          title: `${scenario.name} — Analysis Report`,
          type: 'SCENARIO_ANALYSIS',
          status: 'GENERATED',
          tone: 'TECHNICAL',
          content: JSON.stringify({
            executiveSummary: scenario.executiveSummary,
            impactAnalysis: scenario.impactAnalysis,
            implementationPlan: scenario.implementationPlan,
            recommendations: scenario.recommendations,
            riskFactors: scenario.riskFactors,
            monitoringPlan: scenario.monitoringPlan,
            strategies: scenario.strategies,
            stats: {
              totalCostLocal: scenario.totalCostLocal,
              currencyCode: currency.code,
              currencySymbol: currency.symbol,
              tempReductionC: scenario.projectedTempReductionC,
              livesSaved: scenario.projectedLivesSaved,
              co2ReductionTons: scenario.projectedCo2ReductionTons,
              energySavingsKwh: scenario.projectedEnergySavingsKwh,
              costBenefitRatio: scenario.costBenefitRatio,
              timelineMonths: scenario.timelineMonths,
            },
            variant: key,
          }),
          generatedById: resolvedUserId,
        },
      });

      savedScenarios.push({
        id: dbScenario.id,
        variant: key,
        ...scenario,
      });
    }

    return NextResponse.json({
      success: true,
      scenarios: savedScenarios,
    });
  } catch (error) {
    console.error('Scenario generation error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate scenarios';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
