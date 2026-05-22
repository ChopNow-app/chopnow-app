import { AdminMetrics } from '@/features/admin/components/AdminMetrics';

// Pilot KPIs — 7-day reorder rate, completion rate, avg delivery + vendor accept time.
// Drives the Week-3 decision point of the COD-only Douala micro-zone pilot.
export default function AdminMetricsPage() {
  return <AdminMetrics />;
}
