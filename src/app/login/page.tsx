'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/map';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginToast, setLoginToast] = useState<{ role: string; name: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        // Fetch session to get role-based redirect
        const res = await fetch('/api/auth/session');
        const session = await res.json();
        const role = session?.user?.role;
        const onboardingComplete = !!session?.user?.onboardingComplete;
        const userName = session?.user?.name || session?.user?.email;

        // Show login toast
        setLoginToast({ role: role || 'USER', name: userName });
        await new Promise(resolve => setTimeout(resolve, 2000));

        const roleRedirects: Record<string, string> = {
          SUPER_ADMIN: '/dashboard/admin',
          CITY_ADMIN: onboardingComplete ? '/dashboard/map' : '/dashboard/onboarding',
          URBAN_PLANNER: onboardingComplete ? '/dashboard/map' : '/dashboard/waiting',
          CITY_COUNCIL: '/dashboard/scenarios',
          MUNICIPAL_COMMISSIONER: '/dashboard/commissioner',
          WARD_OFFICER: '/dashboard/ward',
          SDMA_OBSERVER: '/dashboard/state',
          NGO_FIELD_WORKER: '/dashboard/field',
          DATA_ANALYST: '/dashboard/analyst',
          CITIZEN_REPORTER: '/dashboard/citizen',
        };

        router.push(roleRedirects[role] || callbackUrl);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Login Toast */}
      {loginToast && (
        <div className="fixed top-6 right-6 z-[100] animate-reveal-up">
          <div className="glass-card rounded-2xl px-6 py-4 glow-primary flex items-center gap-3">
            <span className="material-symbols-outlined text-[#69f6b8] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <div>
              <p className="text-white font-bold text-sm">Signed in as {loginToast.role.replace(/_/g, ' ')}</p>
              <p className="text-[#a3aac4] text-xs">{loginToast.name}</p>
            </div>
          </div>
        </div>
      )}
      {/* Animated background */}
      <div className="fixed inset-0 bg-[#060e20] grid-pattern" />
      <div className="orb orb-primary w-[500px] h-[500px] -top-[100px] -right-[100px] fixed" />
      <div className="orb orb-secondary w-[400px] h-[400px] bottom-[10%] -left-[100px] fixed" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-reveal-up">
        <div className="glass-card rounded-3xl p-8 md:p-10 glow-primary relative overflow-hidden">
          <div className="shimmer-bg absolute inset-0 rounded-3xl" />
          <div className="relative z-10">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[#69f6b8] font-[family-name:var(--font-headline)]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                HeatPlan
              </Link>
              <h1 className="text-2xl font-bold text-white mt-4 font-[family-name:var(--font-headline)]">Welcome back</h1>
              <p className="text-sm text-[#a3aac4] mt-1">Sign in to your city dashboard</p>
            </div>

            {/* Google OAuth Button */}
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 glass-card hover:border-white/15 rounded-xl transition-all text-white font-medium group"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="group-hover:text-[#69f6b8] transition-colors">Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-xs text-[#6d758c] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 glow-error">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#060e20]/60 border border-white/8 rounded-xl text-white placeholder:text-[#40485d] focus:outline-none focus:border-[#69f6b8]/40 input-glow transition-all"
                  placeholder="you@example.com"
                  required
                  data-testid="email-input"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#6d758c] mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#060e20]/60 border border-white/8 rounded-xl text-white placeholder:text-[#40485d] focus:outline-none focus:border-[#69f6b8]/40 input-glow transition-all pr-12"
                    placeholder="••••••••"
                    required
                    data-testid="password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d758c] hover:text-[#69f6b8] transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-[#a3aac4] group">
                  <input type="checkbox" className="rounded border-white/20 bg-white/5 accent-[#69f6b8]" />
                  <span className="text-xs group-hover:text-white transition-colors">Remember me</span>
                </label>
                <a href="#" className="text-xs text-[#69f6b8] hover:underline underline-offset-4">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-xl hover:shadow-lg hover:shadow-[#69f6b8]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed btn-shine"
                data-testid="sign-in-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-sm text-[#a3aac4] mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#69f6b8] hover:underline font-semibold underline-offset-4">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060e20] grid-pattern" />}>
      <LoginPageContent />
    </Suspense>
  );
}
