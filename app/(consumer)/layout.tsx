import { LaunchPromoBanner } from '@/components/LaunchPromoBanner';

// Route group: shared shell for consumer-facing pages
// (/, /restaurants, /vendors/[id], /cart, /orders/[id]).
// The folder name `(consumer)` is parenthesised so it does NOT appear in URLs.
//
// The cart state lives in a Zustand store (features/cart/store.tsx); no
// Provider needs to be mounted. Persistence + tab sync are handled by
// the store's `persist` middleware.
//
// `LaunchPromoBanner` (the BIENVENUE first-order free-delivery promo)
// is mounted here so it shows on every consumer surface but auto-skips
// /admin, /vendor, /livreur (those live outside this route group).
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LaunchPromoBanner />
      {children}
    </>
  );
}
