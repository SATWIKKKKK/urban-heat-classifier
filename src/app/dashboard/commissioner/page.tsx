'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface ApprovalItem {
  id: string;
  type: string;
  title: string;
  submittedBy: string;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  budget?: string;
}

export default function CommissionerDashboard() {
  const { data: session } = useSession();
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, totalBudget: '₹0', wards: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data — replace with real API calls
    setPendingApprovals([
      { id: '1', type: 'Scenario', title: 'Green Corridor Phase 1', submittedBy: 'Ward Officer - Zone A', date: '2025-01-15', status: 'PENDING', budget: '₹2.5 Cr' },
      { id: '2', type: 'Budget', title: 'Tree Plantation Drive Q2', submittedBy: 'Urban Planner', date: '2025-01-14', status: 'PENDING', budget: '₹85 Lakh' },
      { id: '3', type: 'Intervention', title: 'Cool Roof Program - Ward 12', submittedBy: 'Ward Officer - Zone B', date: '2025-01-13', status: 'APPROVED', budget: '₹1.2 Cr' },
    ]);
    setStats({ pending: 5, approved: 12, totalBudget: '₹18.5 Cr', wards: 8 });
    setLoading(false);
  }, []);

  async function handleApproval(id: string, action: 'APPROVED' | 'REJECTED') {
    setPendingApprovals(prev =>
      prev.map(item => item.id === id ? { ...item, status: action } : item)
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[var(--green-400)]">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-white">
          Commissioner Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">Welcome, {session?.user?.name}. Review and approve city-wide heat mitigation plans.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Approvals', value: stats.pending, icon: 'pending_actions', color: 'var(--high)' },
          { label: 'Approved This Month', value: stats.approved, icon: 'task_alt', color: 'var(--green-400)' },
          { label: 'Total Budget Approved', value: stats.totalBudget, icon: 'account_balance', color: 'var(--info)' },
          { label: 'Active Wards', value: stats.wards, icon: 'location_city', color: 'var(--critical)' },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-5">
            <span className="material-symbols-outlined text-2xl mb-2" style={{ color: stat.color, fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
            <div className="text-2xl font-black text-white font-[family-name:var(--font-headline)]">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Approval Queue */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--high)]" style={{ fontVariationSettings: "'FILL' 1" }}>approval</span>
          Approval Queue
        </h2>
        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                  item.status === 'PENDING' ? 'bg-[var(--high)]/10' :
                  item.status === 'APPROVED' ? 'bg-[var(--green-400)]/10' : 'bg-[var(--critical)]/10'
                }`}>
                  <span className="material-symbols-outlined" style={{
                    color: item.status === 'PENDING' ? 'var(--high)' : item.status === 'APPROVED' ? 'var(--green-400)' : 'var(--critical)',
                    fontVariationSettings: "'FILL' 1"
                  }}>
                    {item.status === 'PENDING' ? 'hourglass_top' : item.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                  </span>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">{item.title}</div>
                  <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                    <span>{item.type}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{item.submittedBy}</span>
                    <span className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                    <span>{item.date}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.budget && <span className="text-sm font-bold text-[var(--info)]">{item.budget}</span>}
                {item.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(item.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-[var(--green-400)]/10 text-[var(--green-400)] rounded-lg text-xs font-bold hover:bg-[var(--green-400)]/20 transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproval(item.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-[var(--critical)]/10 text-[var(--critical)] rounded-lg text-xs font-bold hover:bg-[var(--critical)]/20 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {item.status !== 'PENDING' && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                    item.status === 'APPROVED' ? 'bg-[var(--green-400)]/10 text-[var(--green-400)]' : 'bg-[var(--critical)]/10 text-[var(--critical)]'
                  }`}>
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* City Overview */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--info)]" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
            Heat Index Overview
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">City-wide heat monitoring data will appear here once wards submit their reports.</p>
          <div className="mt-4 bg-[var(--bg-elevated)] rounded-xl p-4 text-center">
            <span className="text-4xl font-black text-[var(--high)] font-[family-name:var(--font-headline)]">38.5°C</span>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Average city temperature today</p>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--green-400)]" style={{ fontVariationSettings: "'FILL' 1" }}>forest</span>
            Intervention Progress
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">Track city-wide cooling intervention deployment status.</p>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Tree Plantation', progress: 65, color: 'var(--green-400)' },
              { name: 'Cool Roofs', progress: 40, color: 'var(--info)' },
              { name: 'Urban Parks', progress: 25, color: 'var(--high)' },
            ].map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{item.name}</span>
                  <span className="font-bold" style={{ color: item.color }}>{item.progress}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.progress}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
