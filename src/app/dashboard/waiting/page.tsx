'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function WaitingPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const cityId = session?.user?.cityId;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, status]);

  useEffect(() => {
    if (session?.user?.onboardingComplete) {
      router.replace('/dashboard/map');
    }
  }, [router, session?.user?.onboardingComplete]);

  useEffect(() => {
    if (!cityId || session?.user?.onboardingComplete) {
      return;
    }

    const interval = window.setInterval(() => {
      void checkStatus();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [cityId, session?.user?.onboardingComplete]);

  async function checkStatus() {
    if (!cityId) {
      return;
    }

    setChecking(true);
    try {
      const response = await fetch(`/api/onboarding/status?cityId=${encodeURIComponent(cityId)}`);
      const payload = await response.json();

      if (response.ok && payload.isComplete) {
        await update({ onboardingComplete: true });
        router.replace('/dashboard/map');
      }
    } finally {
      setChecking(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-10 text-center max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--green-400)]/30 border-t-[var(--green-400)] rounded-full animate-spin"></div>
          <span className="text-sm text-[var(--text-secondary)]">Checking setup…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-10 text-center text-white">
      <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--green-400)]/10 mb-6">
        <span className="material-symbols-outlined text-4xl text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>hourglass_top</span>
        <div className="absolute inset-0 rounded-full border-2 border-[var(--green-400)]/20 animate-ping"></div>
      </div>
      <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-headline)]">Almost there</h1>
      <p className="mt-4 text-base text-[var(--text-secondary)] max-w-md mx-auto">
        Your city administrator is still completing the setup for your city. You will gain access to the
        planning dashboard as soon as onboarding is complete.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => void checkStatus()}
          className="rounded-xl bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] px-5 py-3 text-sm font-bold text-[var(--bg-base)] "
        >
          {checking ? 'Checking…' : 'Check Again'}
        </button>
        <Link href="/login" className="rounded-xl border border-[var(--border-strong)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--bg-elevated)] transition-all">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
