'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MapPin, AlertTriangle, ThumbsUp, Send, CheckCircle, Clock } from 'lucide-react';

type Severity = 'UNCOMFORTABLE' | 'HOT' | 'VERY_HOT' | 'DANGEROUS';
type ReportStatus = 'SUBMITTED' | 'ACKNOWLEDGED' | 'RESOLVED';

interface CitizenReportRecord {
  id: string;
  description: string;
  heatSeverity: string;
  status: ReportStatus;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
}

const SEVERITY_OPTIONS: { value: Severity; label: string; color: string }[] = [
  { value: 'UNCOMFORTABLE', label: 'Uncomfortable', color: '#eab308' },
  { value: 'HOT', label: 'Hot', color: '#f97316' },
  { value: 'VERY_HOT', label: 'Very Hot', color: '#ef4444' },
  { value: 'DANGEROUS', label: 'Dangerous', color: '#dc2626' },
];

const PROBLEM_TYPES = [
  'No shade or trees',
  'Excessive heat on streets',
  'No cooling center nearby',
  'Heat affecting elderly neighbors',
  'Heat affecting children',
];

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  SUBMITTED: { label: 'Pending review', color: '#eab308' },
  ACKNOWLEDGED: { label: 'Seen by city team', color: '#3b82f6' },
  RESOLVED: { label: 'Addressed', color: '#22c55e' },
};

export default function ResidentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [severity, setSeverity] = useState<Severity | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [otherProblem, setOtherProblem] = useState('');
  const [showOther, setShowOther] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [myReports, setMyReports] = useState<CitizenReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // Redirect if not authenticated or wrong role
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.replace('/login');
    } else if (session.user.role !== 'RESIDENT') {
      router.replace('/dashboard/mydata');
    }
  }, [session, status, router]);

  // Load existing reports
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/resident/reports')
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((data) => setMyReports(data.reports ?? []))
      .catch(() => setMyReports([]))
      .finally(() => setReportsLoading(false));
  }, [session?.user?.id, submitted]);

  // Location search with Nominatim
  useEffect(() => {
    if (locationSearch.length < 3) {
      setLocationResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&limit=5`
        );
        const data = await res.json();
        setLocationResults(data);
      } catch {
        setLocationResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [locationSearch]);

  function toggleProblem(p: string) {
    setProblems((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSubmit() {
    if (!severity || problems.length === 0) return;
    if (!session?.user?.id) return;

    setSubmitting(true);
    setSubmitError('');

    const allProblems = [...problems];
    if (showOther && otherProblem.trim()) allProblems.push(otherProblem.trim());

    try {
      const res = await fetch('/api/resident/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heatSeverity: severity,
          description: allProblems.join(', '),
          latitude: selectedLocation?.lat ?? null,
          longitude: selectedLocation?.lon ?? null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error ?? 'Failed to submit. Please try again.');
        return;
      }

      setSubmitted(true);
      setSeverity(null);
      setProblems([]);
      setOtherProblem('');
      setShowOther(false);
      setLocationSearch('');
      setSelectedLocation(null);
    } catch {
      setSubmitError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Heat Report</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Report heat problems in your area
        </p>
      </div>

      {/* Success state */}
      {submitted && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <CheckCircle size={20} className="text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">Your report has been submitted</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              The city planning team will review your report. You will see it appear in My Reports
              below shortly.
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-medium text-green-400 hover:text-green-300"
              onClick={() => setSubmitted(false)}
            >
              Submit another report →
            </button>
          </div>
        </div>
      )}

      {/* Report form */}
      {!submitted && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Report a Heat Problem</h2>

          {/* Location search */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">
              Your Location
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
                <MapPin size={14} className="text-[var(--text-tertiary)] shrink-0" />
                <input
                  type="text"
                  value={selectedLocation?.name ?? locationSearch}
                  onChange={(e) => {
                    setLocationSearch(e.target.value);
                    setSelectedLocation(null);
                  }}
                  placeholder="Search for your area…"
                  className="flex-1 text-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                />
                {selectedLocation && (
                  <button
                    type="button"
                    onClick={() => { setSelectedLocation(null); setLocationSearch(''); }}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    ×
                  </button>
                )}
              </div>
              {locationResults.length > 0 && !selectedLocation && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden shadow-xl">
                  {locationResults.map((r) => (
                    <button
                      key={r.lat + r.lon}
                      type="button"
                      onClick={() => {
                        setSelectedLocation({ lat: parseFloat(r.lat), lon: parseFloat(r.lon), name: r.display_name });
                        setLocationSearch('');
                        setLocationResults([]);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-3">
              How severe is the heat in your area?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSeverity(opt.value)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                    severity === opt.value
                      ? 'text-white border-transparent'
                      : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                  }`}
                  style={severity === opt.value ? { backgroundColor: opt.color, borderColor: opt.color } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Problem types */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-3">
              What is the problem? <span className="normal-case">(select all that apply)</span>
            </label>
            <div className="space-y-2">
              {PROBLEM_TYPES.map((p) => (
                <label key={p} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={problems.includes(p)}
                    onChange={() => toggleProblem(p)}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-elevated)] text-green-500 cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    {p}
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showOther}
                  onChange={(e) => setShowOther(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-elevated)] text-green-500 cursor-pointer"
                />
                <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  Other
                </span>
              </label>
              {showOther && (
                <input
                  type="text"
                  value={otherProblem}
                  onChange={(e) => setOtherProblem(e.target.value)}
                  placeholder="Describe the problem…"
                  className="w-full mt-1 px-3 py-2 text-sm bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--border-strong)]"
                />
              )}
            </div>
          </div>

          {/* Error */}
          {submitError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {submitError}
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!severity || problems.length === 0 || submitting}
            className={`w-full flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-sm transition-all ${
              severity && problems.length > 0 && !submitting
                ? 'bg-[var(--green-500)] text-white hover:bg-[var(--green-400)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={14} />
                Report This Problem
              </>
            )}
          </button>
        </div>
      )}

      {/* My Reports */}
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">My Reports</h2>

        {reportsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : myReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl">
            <ThumbsUp size={28} className="text-[var(--text-tertiary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">No reports yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Submit your first heat problem report above.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {myReports.map((report) => {
              const statusInfo = STATUS_LABELS[report.status] ?? STATUS_LABELS.SUBMITTED;
              return (
                <div
                  key={report.id}
                  className="flex items-start justify-between gap-4 p-4 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {report.description}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                      <span>{report.heatSeverity.replace(/_/g, ' ')}</span>
                      <span>·</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                    {report.status === 'RESOLVED' ? (
                      <CheckCircle size={12} style={{ color: statusInfo.color }} />
                    ) : (
                      <Clock size={12} style={{ color: statusInfo.color }} />
                    )}
                    <span className="text-xs font-medium" style={{ color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
