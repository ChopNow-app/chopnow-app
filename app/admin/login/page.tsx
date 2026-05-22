import { AdminLoginPage } from '@/features/admin/components/AdminLoginPage';

// Story 1.6 — admin email+password login. Issues an 8h JWT and redirects
// to /admin. No refresh-token flow on the backend; admin re-enters at session end.
export default function AdminLoginRoute() {
  return <AdminLoginPage />;
}
