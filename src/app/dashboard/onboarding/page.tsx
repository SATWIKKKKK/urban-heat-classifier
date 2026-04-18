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
    if (!session?.user?.cityId) return;
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
    await updateOnboardingAction(session.user.cityId, stepData);
  }

  async function prevStep() {
    if (currentStep === 0) return;
    setCurrentStep(currentStep - 1);
  }

  async function addNeighborhood() {
    if (!neighborhoodName.trim() || !session?.user?.cityId) return;
    setSaving(true);
    try {
      await addNeighborhoodAction({
        cityId: session.user.cityId,
        name: neighborhoodName,
      });
      setNeighborhoods([...neighborhoods, neighborhoodName]);
      setNeighborhoodName('');
    } catch {
      // ignore
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
      router.replace('/dashboard/map');
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
        <p className="text-[#a3aac4] mt-1">Let&apos;s set up your city&apos;s heat mitigation program</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((step, idx) => (
          <div key={step.title} className="flex items-center gap-2 shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              idx < currentStep ? 'bg-[#69f6b8] text-[#002919]' :
              idx === currentStep ? 'bg-[#69f6b8]/20 text-[#69f6b8] border border-[#69f6b8]' :
              'bg-white/5 text-[#a3aac4]'
            }`}>
              {idx < currentStep ? (
                <span className="material-symbols-outlined text-sm">check</span>
              ) : (
                idx + 1
              )}
            </div>
            <span className={`text-xs font-semibold hidden md:block ${idx === currentStep ? 'text-white' : 'text-[#a3aac4]'}`}>{step.title}</span>
            {idx < STEPS.length - 1 && <div className="w-8 h-px bg-white/10 hidden md:block" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8 rounded-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-3xl text-[#69f6b8]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {STEPS[currentStep].icon}
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">{STEPS[currentStep].title}</h2>
            <p className="text-sm text-[#a3aac4]">{STEPS[currentStep].description}</p>
          </div>
        </div>

        {/* Step 0: City Profile */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <p className="text-[#a3aac4]">Your city has been created. You can update details later from the admin panel.</p>
            <div className="bg-white/5 p-4 rounded-lg">
              <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">City Name</span>
              <p className="text-white font-bold">{session?.user?.name ? `${session.user.name}'s City` : 'Your City'}</p>
            </div>
          </div>
        )}

        {/* Step 1: Neighborhoods */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-[#a3aac4]">Add the neighborhoods you want to track. You can add more later.</p>
            <div className="flex gap-2">
              <input
                value={neighborhoodName}
                onChange={(e) => setNeighborhoodName(e.target.value)}
                placeholder="Neighborhood name"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#69f6b8]/50 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNeighborhood())}
              />
              <button onClick={addNeighborhood} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl disabled:opacity-50 btn-shine">
                Add
              </button>
            </div>
            {neighborhoods.length > 0 && (
              <div className="space-y-2">
                {neighborhoods.map((n, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg">
                    <span className="material-symbols-outlined text-[#69f6b8] text-sm">check_circle</span>
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
            <p className="text-[#a3aac4]">You can import heat data later from the Data Management page, or record measurements manually for each neighborhood.</p>
            <div className="bg-[#ff8439]/10 border border-[#ff8439]/20 p-4 rounded-lg">
              <span className="text-sm text-[#ff8439] font-semibold">Tip: For best results, import CSV data with temperature measurements from NOAA or local weather stations.</span>
            </div>
          </div>
        )}

        {/* Step 3: Team */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-[#a3aac4]">Invite team members to collaborate. You can do this later from the admin panel.</p>
            <div className="bg-[#699cff]/10 border border-[#699cff]/20 p-4 rounded-lg">
              <span className="text-sm text-[#699cff] font-semibold">Team management can be configured after onboarding from Dashboard → Admin.</span>
            </div>
          </div>
        )}

        {/* Step 4: Alerts */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-[#a3aac4]">Configure heat alert thresholds for your city.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#a3aac4] mb-1">Warning Threshold (°C)</label>
                <input type="number" value={warningThreshold} onChange={(e) => setWarningThreshold(Number(e.target.value))} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff8439]/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#a3aac4] mb-1">Critical Threshold (°C)</label>
                <input type="number" value={criticalThreshold} onChange={(e) => setCriticalThreshold(Number(e.target.value))} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#ff716c]/50 focus:outline-none" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <p className="text-[#a3aac4]">You&apos;re all set! Review the summary and launch your heat mitigation program.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">Neighborhoods Added</span>
                <p className="text-2xl font-bold text-[#69f6b8]">{neighborhoods.length}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg">
                <span className="text-[10px] uppercase tracking-widest text-[#6d758c]">Status</span>
                <p className="text-2xl font-bold text-[#69f6b8]">Ready</p>
              </div>
            </div>
            {launchError && (
              <div className="rounded-lg border border-[#ff716c]/20 bg-[#ff716c]/10 px-4 py-3 text-sm text-[#ffb4ad]">
                {launchError}
              </div>
            )}
          </div>
        )}

        {/* Step Error */}
        {stepError && (
          <div className="mt-4 rounded-lg border border-[#ff716c]/20 bg-[#ff716c]/10 px-4 py-3 text-sm text-[#ffb4ad] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            {stepError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-white/10 text-[#a3aac4] rounded-xl hover:bg-white/5 disabled:opacity-30 transition-all"
          >
            Back
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button onClick={nextStep} className="px-6 py-2 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl btn-shine">
              Continue
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={launching}
              className="px-6 py-2 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl btn-shine disabled:opacity-50"
            >
              {launching ? 'Launching...' : 'Launch Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
