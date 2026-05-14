import { AdminDashboard } from '@/features/admin/components/AdminDashboard';

// Story 6.2 — admin validation queues (vendors + riders).
// Auth-gated at the component level — surfaces a "Connexion admin requise"
// panel with a deep link to /admin/login on 401.
export default function AdminPage() {
  return <AdminDashboard />;
}
