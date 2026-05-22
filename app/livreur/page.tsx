import { LivreurDashboard } from '@/features/livreur/components/LivreurDashboard';

// Stories 4.1 / 4.2 / 4.4 — rider dashboard. Auth-gated at the component
// level so 401 surfaces a "Connecte-toi" panel instead of a blank screen.
export default function LivreurPage() {
  return <LivreurDashboard />;
}
