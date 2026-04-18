import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PdfBuilder } from '@/lib/pdf';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      city: { select: { name: true, state: true } },
      scenario: {
        select: {
          name: true,
          description: true,
          totalEstimatedCostUsd: true,
          totalProjectedLivesSaved: true,
          totalProjectedTempReductionC: true,
          projectedCo2ReductionTons: true,
          priority: true,
          status: true,
          scenarioInterventions: {
            include: { intervention: { include: { neighborhood: { select: { name: true } } } } },
          },
        },
      },
    },
  });

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Only city members can access their own city's reports
  if (report.cityId !== session.user.cityId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Parse stored narrative ────────────────────────────────────────────────
  const content = report.content ?? '';
  const execSummary = extractSection(content, 'EXECUTIVE SUMMARY') ||
    content.replace(/=== .+ ===/g, '').trim().slice(0, 1200) || 'No summary available.';
  const impactSection = extractSection(content, 'IMPACT ANALYSIS') ?? null;
  const recommendations = extractSection(content, 'RECOMMENDATIONS') ?? null;

  // ── Build PDF ─────────────────────────────────────────────────────────────
  const cityLabel = [report.city.name, report.city.state].filter(Boolean).join(', ');
  const toneLabel = report.tone ? ` · ${report.tone[0]}${report.tone.slice(1).toLowerCase()} tone` : '';
  const dateLabel = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const builder = new PdfBuilder();

  builder
    .addTitle(report.title)
    .addMeta(`${cityLabel} · ${report.type.replace(/_/g, ' ')}${toneLabel} · Generated ${dateLabel}`)
    .addDivider();

  // ── Scenario stats row (if linked) ───────────────────────────────────────
  if (report.scenario) {
    const sc = report.scenario;
    builder.addStatRow([
      { label: 'Est. Budget', value: sc.totalEstimatedCostUsd != null ? `$${(sc.totalEstimatedCostUsd / 1_000_000).toFixed(1)}M` : 'N/A' },
      { label: 'Lives Protected', value: sc.totalProjectedLivesSaved != null ? String(sc.totalProjectedLivesSaved) : 'N/A', accent: true },
      { label: 'Cooling', value: sc.totalProjectedTempReductionC != null ? `-${sc.totalProjectedTempReductionC.toFixed(1)} \u00b0C` : 'N/A', accent: true },
      { label: 'CO\u2082 Reduction', value: sc.projectedCo2ReductionTons != null ? `${sc.projectedCo2ReductionTons.toFixed(0)}t` : 'N/A' },
    ]);
  }

  // ── Narrative sections ────────────────────────────────────────────────────
  builder.addH1('Executive Summary').addParagraph(execSummary);

  if (impactSection) {
    builder.addH1('Impact Analysis').addParagraph(impactSection);
  }

  if (recommendations) {
    builder.addH1('Recommendations').addParagraph(recommendations);
  }

  // ── Interventions table (if scenario linked) ─────────────────────────────
  if (report.scenario?.scenarioInterventions?.length) {
    builder.addH1('Interventions Plan');
    const headers = ['Intervention', 'Type', 'Neighborhood', 'Est. Cost', 'Cooling'];
    const rows = report.scenario.scenarioInterventions.map(({ intervention: inv }) => [
      inv.name,
      inv.type.replace(/_/g, ' '),
      inv.neighborhood?.name ?? 'City-wide',
      inv.estimatedCostUsd != null ? `$${(inv.estimatedCostUsd / 1000).toFixed(0)}k` : '—',
      inv.estimatedTempReductionC != null ? `-${inv.estimatedTempReductionC.toFixed(2)}\u00b0C` : '—',
    ]);
    builder.addTable(headers, rows, [2.5, 1.5, 1.5, 1, 1]);
  }

  builder.addDivider();
  builder.addMeta(`CONFIDENTIAL \u2014 FOR OFFICIAL USE ONLY  |  ${cityLabel} Urban Heat Mitigation Program`);

  const pdfBuffer = builder.build();

  const safeName = report.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractSection(text: string, heading: string): string | null {
  const re = new RegExp(`===\\s*${heading}\\s*===\\s*([\\s\\S]*?)(?:===|$)`, 'i');
  const m = re.exec(text);
  if (m) return m[1].trim();

  // Fallback: try markdown-style heading
  const re2 = new RegExp(`#+\\s*${heading}[:\\s]*([\\s\\S]*?)(?:(?:^#+\\s)|$)`, 'im');
  const m2 = re2.exec(text);
  return m2 ? m2[1].trim() : null;
}
