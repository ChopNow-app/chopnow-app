import { CartPage } from '@/features/cart/components/CartPage';

// Story 3.1 — cart + order creation. Auth-gated at the component level so
// unauthenticated visitors see the "Connecte-toi" panel instead of a 401.
export default function CartRoute() {
  return <CartPage />;
}
