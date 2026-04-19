import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { generateReportAction, getScenarios } from '@/lib/actions';

export default async function GenerateReportPage() {
  const session = await auth();

  if (!session?.user?.cityId || !session.user.id) {
    redirect('/login');
  }

  if (session.user.role === 'CITY_COUNCIL') {
    redirect('/dashboard/reports');
  }

  const cityId = session.user.cityId;
  const userId = session.user.id;
  const scenarios = await getScenarios(cityId);

  async function createReport(formData: FormData) {
    'use server';

    const title = String(formData.get('title') || '').trim();
    const type = String(formData.get('type') || 'SCENARIO_IMPACT');
    const tone = String(formData.get('tone') || 'ACCESSIBLE');
    const scenarioId = String(formData.get('scenarioId') || '').trim() || undefined;

    await generateReportAction({
      cityId,
      scenarioId,
      title,
      type,
      tone,
      generatedById: userId,
      content: `Generated ${type} report in ${tone.toLowerCase()} tone for ${title}.`,
    });

    redirect('/dashboard/reports');
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Generate Report</h1>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">Create a report package for planners, admins, or city council review.</p>
      </div>

      <form action={createReport} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <select name="type" className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none">
            <option value="VULNERABILITY_ASSESSMENT">Vulnerability Assessment</option>
            <option value="SCENARIO_IMPACT">Scenario Impact</option>
            <option value="ANNUAL_PROGRESS">Annual Progress</option>
            <option value="COUNCIL_BRIEF">Council Brief</option>
          </select>
          <select name="scenarioId" className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none">
            <option value="">No linked scenario</option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
            ))}
          </select>
          <select name="tone" className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none">
            <option value="ACCESSIBLE">Accessible</option>
            <option value="TECHNICAL">Technical</option>
            <option value="EXECUTIVE">Executive</option>
          </select>
          <input name="title" className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-3 text-white focus:border-[var(--green-400)]/50 focus:outline-none" placeholder="Summer 2025 Heat Mitigation Impact Analysis" required />
        </div>
        <div className="mt-6 flex justify-end">
          <button type="submit" className="rounded-xl bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] px-5 py-3 text-sm font-bold text-[var(--bg-base)] ">
            Generate Report
          </button>
        </div>
      </form>
    </div>
  );
}
