'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { completeOnboardingAction, updateOnboardingAction, addNeighborhoodAction } from '@/lib/actions';

const STEPS = [
  { title: 'City Profile', icon: 'location_city', description: 'Review your city information' },
  { title: 'Add Neighborhoods', icon: 'map', description: 'Define your city neighborhoods' },
  { title: 'Heat Data', icon: 'thermostat', description: 'Set baseline temperature data' },
  { title: 'Team', icon: 'groups', description: 'Invite team members' },
  { title: 'Alerts', icon: 'notifications', description: 'Configure heat alert thresholds' },
  { title: 'Review', icon: 'check_circle', description: 'Review and launch' },
];

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [neighborhoodName, setNeighborhoodName] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [warningThreshold, setWarningThreshold] = useState(35);
  const [criticalThreshold, setCriticalThreshold] = useState(40);

  const STEP_KEYS = ['step1City', 'step2Neighbors', 'step3Heat', 'step4Team', 'step5Alerts', 'step6Complete'];

  function validateCurrentStep(): string | null {
    switch (currentStep) {
      case 1:
        if (neighborhoods.length === 0) return 'Add at least one neighborhood before continuing.';
        break;
      case 4:
        if (!warningThreshold || !criticalThreshold) return 'Set both alert thresholds.';
        if (warningThreshold >= criticalThreshold) return 'Warning threshold must be less than critical threshold.';
        break;
    }
    return null;
  }

  async function nextStep() {
    if (!session?.user?.cityId) {
      setStepError('Your session is missing city data. Please sign out and sign back in.');
      return;
    }
    const error = validateCurrentStep();
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    const next = currentStep + 1;
    setCurrentStep(next);
    const stepData: Record<string, boolean> = {};
    stepData[STEP_KEYS[currentStep]] = true;
    try {
      await updateOnboardingAction(session.user.cityId, stepData);
    } catch (e) {
      console.error('Failed to save step progress:', e);
    }
  }

  async function prevStep() {
    if (currentStep === 0) return;
    setCurrentStep(currentStep - 1);
  }

  async function addNeighborhood() {
    if (!neighborhoodName.trim()) return;
    if (!session?.user?.cityId) {
      setStepError('Your session is missing city data. Please sign out and sign back in.');
      return;
    }
    setSaving(true);
    setStepError(null);
    try {
      await addNeighborhoodAction({
        cityId: session.user.cityId,
        name: neighborhoodName,
      });
      setNeighborhoods([...neighborhoods, neighborhoodName]);
      setNeighborhoodName('');
    } catch (e) {
      setStepError(`Failed to add neighborhood: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (!session?.user?.cityId || launching) return;

    setLaunching(true);
    setLaunchError(null);

    try {
      await completeOnboardingAction(session.user.cityId);
      await update({ onboardingComplete: true });
      router.replace('/dashboard/my-data');
      router.refresh();
    } catch {
      setLaunchError('Unable to launch the dashboard right now. Please try again.');
      setLaunching(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
          Welcome to HeatPlan
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">Let&apos;s set up your city&apos;s heat mitigation program</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => (
          <div key={step.title} className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              idx < currentStep ? 'bg-[var(--green-400)] text-[var(--bg-base)]' :
              idx === currentStep ? 'bg-[var(--green-400)]/20 text-[var(--green-400)] border border-[var(--green-400)]' :
              'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}>
              {idx < currentStep ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                idx + 1
              )}
            </div>
            <span className={`text-xs font-semibold hidden md:block ${idx === currentStep ? 'text-white' : 'text-[var(--text-secondary)]'}`}>{step.title}</span>
            {idx < STEPS.length - 1 && <div className="w-8 h-px bg-[var(--bg-elevated)] hidden md:block" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-3xl text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {STEPS[currentStep].icon}
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{STEPS[currentStep].title}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{STEPS[currentStep].description}</p>
          </div>
        </div>

        {/* Step 0: City Profile */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">Your city has been created. You can update details later from the admin panel.</p>
            <div className="bg-[var(--bg-elevated)] p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">City Name</span>
              <p className="text-white font-bold">{session?.user?.name ? `${session.user.name}'s City` : 'Your City'}</p>
            </div>
          </div>
        )}

        {/* Step 1: Neighborhoods */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">Add the neighborhoods you want to track. You can add more later.</p>
            <div className="flex gap-2">
              <input
                value={neighborhoodName}
                onChange={(e) => setNeighborhoodName(e.target.value)}
                placeholder="Neighborhood name"
                className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--green-400)]/50 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeighborhood())}
              />
              <button onClick={addNeighborhood} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl disabled:opacity-50 ">
                Add
              </button>
            </div>
            {neighborhoods.length > 0 && (
              <div className="space-y-2">
                {neighborhoods.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[var(--bg-elevated)] px-4 py-2 rounded-lg">
                    <span className="material-symbols-outlined text-[var(--green-400)] text-sm">check_circle</span>
                    <span className="text-white text-sm">{n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Heat Data */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">You can import heat data later from the Data Management page, or record measurements manually for each neighborhood.</p>
            <div className="bg-[var(--high)]/10 border border-[var(--high)]/20 p-4 rounded-lg">
              <span className="text-sm text-[var(--high)] font-semibold">Tip: For best results, import CSV data with temperature measurements from NOAA or local weather stations.</span>
            </div>
          </div>
        )}

        {/* Step 3: Team */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">Invite team members to collaborate. You can do this later from the admin panel.</p>
            <div className="bg-[var(--info)]/10 border border-[var(--info)]/20 p-4 rounded-lg">
              <span className="text-sm text-[var(--info)] font-semibold">Team management can be configured after onboarding from Dashboard → Admin.</span>
            </div>
          </div>
        )}

        {/* Step 4: Alerts */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">Configure heat alert thresholds for your city.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Warning Threshold (°C)</label>
                <input type="number" value={warningThreshold} onChange={(e) => setWarningThreshold(Number(e.target.value))} className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--high)]/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[var(--text-secondary)] mb-1">Critical Threshold (°C)</label>
                <input type="number" value={criticalThreshold} onChange={(e) => setCriticalThreshold(Number(e.target.value))} className="w-full px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg text-white focus:border-[var(--critical)]/50 focus:outline-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <p className="text-[var(--text-secondary)]">You&apos;re all set! Review the summary and launch your heat mitigation program.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Neighborhoods Added</span>
                <p className="text-2xl font-bold text-[var(--green-400)]">{neighborhoods.length}</p>
              </div>
              <div className="bg-[var(--bg-elevated)] p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)]">Status</span>
                <p className="text-2xl font-bold text-[var(--green-400)]">Ready</p>
              </div>
            </div>
            {launchError && (
              <div className="rounded-lg border border-[var(--critical)]/20 bg-[var(--critical)]/10 px-4 py-3 text-sm text-[#ffb4ad]">
                {launchError}
              </div>
            )}
          </div>
        )}

        {/* Step Error */}
        {stepError && (
          <div className="mt-4 rounded-lg border border-[var(--critical)]/20 bg-[var(--critical)]/10 px-4 py-3 text-sm text-[#ffb4ad] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {stepError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-elevated)] disabled:opacity-30 transition-all"
          >
            Back
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button onClick={nextStep} className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl ">
              Continue
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={launching}
              className="px-6 py-2 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl  disabled:opacity-50"
            >
              {launching ? 'Launching...' : 'Launch Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
