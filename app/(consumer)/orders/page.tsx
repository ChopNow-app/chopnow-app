import { OrdersListPage } from '@/features/consumer/components/OrdersListPage';

// Story 3.6 — consumer order history index. The bottom-nav "Commandes" tab
// targets this URL; before this page existed, the route 404'd on prefetch
// (caught by Lighthouse 2026-05-16). Auth-gated at the component level so
// the same URL handles logged-in (list) + logged-out (login prompt) states.
export const metadata = { title: 'Mes commandes — ChopNow' };

export default function Page() {
  return <OrdersListPage />;
}
