#!/usr/bin/env node
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateDetailedReportSections } from '../src/lib/ai/detailedReport';
import { PdfBuilder } from '../src/lib/pdf';

async function main() {
  const model = process.env.AI_REPORT_MODEL ?? '(unset)';
  console.log('[check-report-pdf] AI_REPORT_MODEL =', model);

  const detailed = await generateDetailedReportSections({
    placeName: 'Bhubaneswar Ward 12',
    cityName: 'Bhubaneswar',
    countryName: 'India',
    countryCode: 'in',
    vulnerabilityLevel: 'HIGH',
    vulnerabilityScore: 7.6,
    baselineTempC: 39.2,
    population: 126000,
    treeCanopyPct: 11.3,
    imperviousSurfacePct: 62.1,
    projectedTempReductionC: 2.4,
    projectedLivesSaved: 214,
    projectedCo2ReductionTons: 91,
    strategies: [
      {
        type: 'TREE_PLANTING',
        name: 'High-Canopy Native Trees',
        quantity: 2200,
        totalCostLocal: 8800000,
        tempReductionC: 0.9,
        co2ReductionTons: 41,
        placementNotes: 'Road medians and public schools',
      },
      {
        type: 'COOL_PAVEMENT',
        name: 'Reflective Cool Pavement',
        quantity: 18,
        totalCostLocal: 12400000,
        tempReductionC: 1.1,
        co2ReductionTons: 22,
        placementNotes: 'Bus corridors and market streets',
      },
      {
        type: 'GREEN_ROOF',
        name: 'Public Building Green Roof Retrofit',
        quantity: 14,
        totalCostLocal: 9600000,
        tempReductionC: 0.4,
        co2ReductionTons: 28,
        placementNotes: 'Hospitals and municipal offices',
      },
    ],
  });

  console.log('[check-report-pdf] Executive summary chars:', detailed.executiveSummary.length);

  const pdf = new PdfBuilder().setFooter('Bhubaneswar')
    .addTitle('Council Brief Smoke Test')
    .addMeta('Bhubaneswar, India · AI report model verification')
    .addH1('Executive Summary')
    .addParagraph(detailed.executiveSummary)
    .addH1('Key Risk Factors')
    .addBulletList(detailed.keyRiskFactors)
    .addH1('Immediate Actions')
    .addBulletList(detailed.immediateActions);

  const out = join(process.cwd(), 'tmp', 'report-model-smoke-test.pdf');
  const buf = pdf.build();
  writeFileSync(out, buf);

  console.log('[check-report-pdf] PDF generated:', out, `(${buf.length} bytes)`);
}

main().catch((err) => {
  console.error('[check-report-pdf] FAILED', err);
  process.exit(1);
});
