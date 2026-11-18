'use client';
import { AbacusDashboard, useDashboardData } from '@/components/viz/abacus-dashboard';
import { manifest } from '@/lib/dashboard-manifest';

export default function DashboardPage() {
  const { data, dataAsOf, error } = useDashboardData('/api/dashboard', 60_000);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">Failed to load dashboard data.</p>
      </div>
    );
  }

  return <AbacusDashboard manifest={manifest} data={data} dataAsOf={dataAsOf} className="min-h-screen" />;
}
