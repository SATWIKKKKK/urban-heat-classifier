export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-20 rounded bg-[var(--bg-elevated)]" />
        <div className="h-7 w-52 rounded bg-[var(--bg-elevated)]" />
        <div className="h-3 w-80 rounded bg-[var(--bg-elevated)]" />
      </div>

      {/* Content rows skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] last:border-0"
          >
            <div className="h-3 w-40 rounded bg-[var(--bg-elevated)]" />
            <div className="h-3 w-24 rounded bg-[var(--bg-elevated)]" />
            <div className="h-3 w-16 rounded bg-[var(--bg-elevated)] ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
