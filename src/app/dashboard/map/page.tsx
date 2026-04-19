import dynamic from 'next/dynamic';

const DashboardMapClient = dynamic(() => import('./DashboardMapClient'), { ssr: false });

export default function DashboardMapPage() {
  return <DashboardMapClient />;
}
