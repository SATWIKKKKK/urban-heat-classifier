import { redirect } from 'next/navigation';

// The old redirect to /map caused a loop:
// /dashboard → /dashboard/map → /map → /dashboard → ...
// Now we go directly to the neighborhoods page.
export default function DashboardMapPage() {
  redirect('/dashboard/my-data');
}
