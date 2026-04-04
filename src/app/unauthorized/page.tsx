import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#060e20] bg-heat-image flex items-center justify-center p-4">
      <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center">
        <span className="material-symbols-outlined text-6xl text-[#ff716c] mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
          block
        </span>
        <h1 className="font-[var(--font-headline)] text-2xl font-extrabold text-white mb-2">
          Access Denied
        </h1>
        <p className="text-[#a3aac4] mb-6">
          You don&apos;t have permission to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-6 py-2 bg-gradient-to-br from-[#69f6b8] to-[#06b77f] text-[#002919] font-bold rounded-md">
            Go to Dashboard
          </Link>
          <Link href="/login" className="px-6 py-2 border border-white/10 text-[#a3aac4] rounded-md hover:bg-white/5">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
