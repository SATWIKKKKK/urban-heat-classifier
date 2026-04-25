"use client";

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user) {
      // Already signed in — redirect based on role
      if (session.user.role === 'CITY_ADMIN') router.replace('/dashboard/mydata');
      else if (session.user.role === 'RESIDENT') router.replace('/dashboard/resident');
      else router.replace('/select-role');
    }
  }, [session, router]);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupToast, setSignupToast] = useState<{ name: string } | null>(null);

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return { score: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (p.length >= 12) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'var(--critical)', 'var(--high)', '#ca8a04', 'var(--green-400)', 'var(--green-400)'];
    return { score, label: labels[score], color: colors[score] };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Sign in and redirect to select-role to complete onboarding
      await signIn('credentials', { email: form.email, password: form.password, redirect: true, callbackUrl: '/select-role' });
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8">
      {signupToast && (
        <div className="fixed top-6 right-6 z-[100] animate-reveal-up">
          <div className="glass-card rounded-2xl px-6 py-4 glow-primary flex items-center gap-3">
            <span className="material-symbols-outlined text-[var(--green-400)] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
            <div>
              <p className="text-white font-bold text-sm">Signed up</p>
              <p className="text-[var(--text-secondary)] text-xs">{signupToast.name}</p>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-[var(--bg-base)] grid-pattern" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-reveal-up">
        <div className="glass-card rounded-3xl p-8 md:p-10 glow-primary relative overflow-hidden">
          <div className="shimmer-bg absolute inset-0 rounded-3xl" />
          <div className="relative z-10">
            <div className="text-center mb-8">
              <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--green-400)] font-[family-name:var(--font-headline)]">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                HeatPlan
              </Link>
              <h1 className="text-2xl font-bold text-white mt-4 font-[family-name:var(--font-headline)]">Create your account</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Set up your city in under 15 minutes</p>
            </div>

            <button onClick={() => signIn('google', { callbackUrl: '/select-role' })} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 glass-card hover:border-white/15 rounded-xl transition-all text-white font-medium group">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="group-hover:text-[var(--green-400)] transition-colors">Sign up with Google</span>
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2 glow-error"><span className="material-symbols-outlined text-lg">error</span>{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Full name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all" placeholder="Jane Smith" required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Work email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all" placeholder="you@city.gov" required />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all pr-12" placeholder="••••••••" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--green-400)] transition-colors p-1">
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <div className="flex-1 flex gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
                          <div className="h-full rounded-full transition-all duration-300" style={{ width: passwordStrength.score >= i ? '100%' : '0%', backgroundColor: passwordStrength.color }} />
                        </div>
                      ))}
                    </div>
                    <span className="text-xs font-bold" style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2">Confirm password</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} onPaste={(e) => e.preventDefault()} className="w-full px-4 py-3.5 bg-[var(--bg-base)]/60 border border-white/8 rounded-xl text-white placeholder:text-[var(--border-strong)] focus:outline-none focus:border-[var(--green-400)]/40 input-glow transition-all" placeholder="••••••••" required />
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-xl hover:shadow-lg hover:shadow-[var(--green-400)]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed ">
                {loading ? <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Creating account...</span> : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--text-secondary)] mt-6">Already have an account? <Link href="/login" className="text-[var(--green-400)] hover:underline font-semibold underline-offset-4">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
