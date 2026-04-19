import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import GSAPWrapper from '@/components/shared/GSAPWrapper';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      city: { select: { name: true, country: true, state: true } },
    },
  });

  const joinedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const sections = [
    {
      title: 'Account',
      icon: 'manage_accounts',
      color: 'var(--green-400)',
      fields: [
        { label: 'Full Name', value: user?.name ?? '—', key: 'name' },
        { label: 'Email Address', value: user?.email ?? '—', key: 'email', readonly: true },
        { label: 'Role', value: user?.role?.replace(/_/g, ' ') ?? '—', key: 'role', readonly: true },
        { label: 'Member Since', value: joinedDate, key: 'joined', readonly: true },
      ],
    },
    {
      title: 'City & Location',
      icon: 'location_city',
      color: 'var(--info)',
      fields: [
        { label: 'City', value: user?.city?.name ?? '—', key: 'city', readonly: true },
        { label: 'State / Province', value: user?.city?.state ?? '—', key: 'state', readonly: true },
        { label: 'Country', value: user?.city?.country ?? '—', key: 'country', readonly: true },
      ],
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      color: 'var(--high)',
      toggles: [
        { label: 'Heat Alert Emails', desc: 'Get notified when critical heat thresholds are exceeded', enabled: true },
        { label: 'Weekly City Summary', desc: 'Receive a weekly digest of city heat data', enabled: true },
        { label: 'Intervention Status Updates', desc: 'Updates when your interventions change status', enabled: false },
        { label: 'Report Generation Alerts', desc: 'Notify when new council reports are ready', enabled: false },
      ],
    },
    {
      title: 'Security',
      icon: 'security',
      color: 'var(--critical)',
      actions: [
        { label: 'Change Password', icon: 'lock_reset', desc: 'Update your account password', variant: 'outline' as const },
        { label: 'Download My Data', icon: 'download', desc: 'Export all your data in JSON format', variant: 'outline' as const },
        { label: 'Delete Account', icon: 'delete_forever', desc: 'Permanently remove your account and all associated data', variant: 'danger' as const },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto">
      <GSAPWrapper animation="slideUp" duration={0.4}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-[var(--text-tertiary)] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Account Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)]">Manage your profile, notifications, and security preferences.</p>
        </div>
      </GSAPWrapper>

      {/* Profile summary card */}
      <GSAPWrapper animation="slideUp" delay={0.1} duration={0.4}>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-[var(--bg-elevated)] border-2 border-[var(--green-400)]/30 flex items-center justify-center shrink-0 overflow-hidden">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name ?? 'User'} className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-3xl text-[var(--text-tertiary)]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold text-[var(--text-primary)] truncate">{user?.name ?? user?.email}</div>
            <div className="text-sm text-[var(--text-secondary)] truncate mt-0.5">{user?.email}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[var(--green-400)]/10 border border-[var(--green-400)]/20 text-[var(--green-400)] rounded-md">
                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                {user?.role?.replace(/_/g, ' ')}
              </span>
              {user?.city?.name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)] border border-[var(--border)] rounded-md">
                  <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
                  {user.city.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </GSAPWrapper>

      {/* Settings sections */}
      <div className="flex flex-col gap-6">
        {sections.map((section, si) => (
          <GSAPWrapper key={section.title} animation="slideUp" delay={0.1 + si * 0.08} duration={0.4}>
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border)]">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${section.color} 12%, transparent)` }}
                >
                  <span className="material-symbols-outlined text-base" style={{ color: section.color, fontVariationSettings: "'FILL' 1" }}>{section.icon}</span>
                </div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h2>
              </div>

              {/* Fields */}
              {'fields' in section && section.fields && (
                <div className="divide-y divide-[var(--border)]">
                  {section.fields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-tertiary)]">{field.label}</div>
                        <div className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{field.value}</div>
                      </div>
                      {'readonly' in field && !field.readonly ? (
                        <button className="shrink-0 h-8 px-3 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                          Edit
                        </button>
                      ) : (
                        <span className="shrink-0 text-[10px] text-[var(--text-tertiary)] border border-[var(--border)] rounded px-2 py-0.5">
                          {'readonly' in field && field.readonly ? 'Read-only' : 'Managed'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Toggles */}
              {'toggles' in section && section.toggles && (
                <div className="divide-y divide-[var(--border)]">
                  {section.toggles.map((toggle) => (
                    <div key={toggle.label} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{toggle.label}</div>
                        <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{toggle.desc}</div>
                      </div>
                      <div
                        className={`shrink-0 h-5 w-9 rounded-full relative transition-colors ${toggle.enabled ? 'bg-[var(--green-400)]' : 'bg-[var(--bg-overlay)]'}`}
                      >
                        <div
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${toggle.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              {'actions' in section && section.actions && (
                <div className="divide-y divide-[var(--border)]">
                  {section.actions.map((action) => (
                    <div key={action.label} className="flex items-center justify-between px-5 py-3.5 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="material-symbols-outlined text-base shrink-0"
                          style={{ color: action.variant === 'danger' ? 'var(--critical)' : 'var(--text-tertiary)', fontVariationSettings: "'FILL' 1" }}
                        >{action.icon}</span>
                        <div>
                          <div className={`text-sm font-medium ${action.variant === 'danger' ? 'text-[var(--critical)]' : 'text-[var(--text-primary)]'}`}>{action.label}</div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{action.desc}</div>
                        </div>
                      </div>
                      <button
                        className={`shrink-0 h-8 px-3 text-xs font-medium rounded-lg border transition-colors ${
                          action.variant === 'danger'
                            ? 'border-[var(--critical)]/30 text-[var(--critical)] hover:bg-[var(--critical)]/10'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                        }`}
                      >
                        {action.label}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GSAPWrapper>
        ))}
      </div>
    </div>
  );
}
