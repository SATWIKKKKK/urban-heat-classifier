import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.cityId) redirect('/login');

  const cityId = session.user.cityId;

  const [neighborhoods, interventions, scenarios, reports, latestMeasurements] = await Promise.all([
    prisma.neighborhood.count({ where: { cityId } }),
    prisma.intervention.count({ where: { cityId } }),
    prisma.scenario.count({ where: { cityId } }),
    prisma.report.count({ where: { cityId } }),
    prisma.heatMeasurement.findMany({
      where: { neighborhood: { cityId } },
      orderBy: { measurementDate: 'desc' },
      take: 10,
    }),
  ]);

  const avgTemp = latestMeasurements.length > 0
    ? latestMeasurements.reduce((sum, m) => sum + m.avgTempCelsius, 0) / latestMeasurements.length
    : 0;

  const kpis = [
    { label: 'Neighborhoods', value: neighborhoods, icon: 'location_city', color: '#69f6b8' },
    { label: 'Interventions', value: interventions, icon: 'construction', color: '#699cff' },
    { label: 'Scenarios', value: scenarios, icon: 'compare_arrows', color: '#ff8439' },
    { label: 'Reports', value: reports, icon: 'assessment', color: '#dee5ff' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-[var(--font-headline)] text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="text-[#a3aac4] font-medium mt-1">
            Overview of your city&apos;s heat mitigation program
          </p>
        </div>
        <div className="flex gap-4 flex-wrap">
          <Link href="/scenarios" className="flex items-center gap-2 px-5 py-2.5 glass-card text-[#dee5ff] rounded-md transition-all hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">add_task</span>
            <span className="font-semibold text-sm">New Scenario</span>
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card-hover p-6 rounded-xl relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: kpi.color }}>
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
              <span className="material-symbols-outlined text-6xl">{kpi.icon}</span>
            </div>
            <p className="text-[#a3aac4] text-[10px] uppercase tracking-widest mb-2 font-bold">{kpi.label}</p>
            <span className="font-[var(--font-headline)] text-3xl font-bold text-white">{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Temperature Card */}
      {avgTemp > 0 && (
        <div className="glass-card-hover p-6 rounded-xl">
          <h3 className="font-[var(--font-headline)] text-xl font-bold text-white mb-2">Latest Average Temperature</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[#ff8439]">{avgTemp.toFixed(1)}°C</span>
            <span className="text-sm text-[#a3aac4]">({(avgTemp * 9 / 5 + 32).toFixed(1)}°F)</span>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/neighborhoods" className="glass-card-hover p-6 rounded-xl group block">
          <div className="h-12 w-12 rounded-xl bg-[#69f6b8]/10 flex items-center justify-center text-[#69f6b8] mb-4">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_city</span>
          </div>
          <h3 className="font-bold text-white text-lg">Manage Neighborhoods</h3>
          <p className="text-[#a3aac4] text-sm mt-2">Add neighborhoods, record heat measurements, and view vulnerability scores.</p>
          <span className="text-[#69f6b8] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
            Go to Neighborhoods <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>

        <Link href="/map" className="glass-card-hover p-6 rounded-xl group block">
          <div className="h-12 w-12 rounded-xl bg-[#699cff]/10 flex items-center justify-center text-[#699cff] mb-4">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          </div>
          <h3 className="font-bold text-white text-lg">Interactive Map</h3>
          <p className="text-[#a3aac4] text-sm mt-2">View heat zones, place interventions, and explore spatial data.</p>
          <span className="text-[#699cff] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
            Open Map <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>

        <Link href="/dashboard/data" className="glass-card-hover p-6 rounded-xl group block">
          <div className="h-12 w-12 rounded-xl bg-[#ff8439]/10 flex items-center justify-center text-[#ff8439] mb-4">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>upload_file</span>
          </div>
          <h3 className="font-bold text-white text-lg">Import Data</h3>
          <p className="text-[#a3aac4] text-sm mt-2">Import CSV, GeoJSON, and weather data to populate your city&apos;s heat profile.</p>
          <span className="text-[#ff8439] text-xs font-bold mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
            Import Data <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
