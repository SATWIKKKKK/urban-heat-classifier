'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Building2, Home, ArrowRight, Loader2 } from 'lucide-react';
import { selectRoleAction } from './actions';

type RoleOption = 'CITY_ADMIN' | 'RESIDENT';

export default function SelectRolePage() {
  const { update } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<RoleOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleContinue() {
    if (!selected) return;
    setLoading(true);
    setError('');

    try {
      const result = await selectRoleAction(selected);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Force token refresh with new role
      await update();

      // Redirect to appropriate dashboard
      if (selected === 'CITY_ADMIN') {
        router.replace('/dashboard/mydata');
      } else {
        router.replace('/dashboard/resident');
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 grid-pattern opacity-20 pointer-events-none" />
      <div className="fixed top-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px]">
        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="material-symbols-outlined text-3xl text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>
              eco
            </span>
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-green-400">
              HeatPlan
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to HeatPlan</h1>
          <p className="text-sm text-white/50">Tell us how you will use HeatPlan</p>
        </div>

        {/* Role cards */}
        <div className="flex flex-col gap-3 mb-6">
          {/* City Administrator */}
          <button
            type="button"
            onClick={() => setSelected('CITY_ADMIN')}
            className={`group w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
              selected === 'CITY_ADMIN'
                ? 'border-green-500 bg-green-500/10'
                : 'border-white/[0.08] bg-white/[0.03] hover:border-green-500/50 hover:bg-green-500/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selected === 'CITY_ADMIN' ? 'bg-green-500/20' : 'bg-white/5 group-hover:bg-green-500/10'
                }`}
              >
                <Building2 size={24} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">City Administrator</span>
                  {selected === 'CITY_ADMIN' && (
                    <span className="shrink-0 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  I manage urban heat mitigation planning for a city. I will add places, build
                  scenarios, and generate cooling reports.
                </p>
              </div>
            </div>
          </button>

          {/* Resident */}
          <button
            type="button"
            onClick={() => setSelected('RESIDENT')}
            className={`group w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
              selected === 'RESIDENT'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/[0.08] bg-white/[0.03] hover:border-blue-500/50 hover:bg-blue-500/5'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selected === 'RESIDENT' ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-blue-500/10'
                }`}
              >
                <Home size={24} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white">Resident</span>
                  {selected === 'RESIDENT' && (
                    <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-white" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/50 leading-relaxed">
                  I live in a city and want to report heat problems in my area and see what my
                  city is doing about urban heat.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-400 text-center mb-4">{error}</p>
        )}

        {/* Continue button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || loading}
          className={`w-full flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all ${
            selected && !loading
              ? 'bg-green-500 text-white hover:bg-green-400 cursor-pointer'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Setting up your account…
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
