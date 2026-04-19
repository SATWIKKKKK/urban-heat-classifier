import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] bg-heat-image flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center">
        <span className="material-symbols-outlined text-6xl text-[var(--critical)] mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
          block
        </span>
        <h1 className="font-[var(--font-headline)] text-2xl font-extrabold text-white mb-2">
          Access Denied
        </h1>
        <p className="text-[var(--text-secondary)] mb-6">
          You don&apos;t have permission to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-6 py-2 bg-gradient-to-br from-[var(--green-400)] to-[var(--green-500)] text-[var(--bg-base)] font-bold rounded-md">
            Go to Dashboard
          </Link>
          <Link href="/login" className="px-6 py-2 border border-white/10 text-[var(--text-secondary)] rounded-md hover:bg-[var(--bg-elevated)]">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
