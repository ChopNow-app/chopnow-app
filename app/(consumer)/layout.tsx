import { CartProvider } from '@/features/cart/store';

// Route group: shared shell for consumer-facing pages
// (/, /restaurants, /vendors/[id], /cart, /orders/[id]).
// The folder name `(consumer)` is parenthesised so it does NOT appear in URLs.
//
// CartProvider lives here so the cart state spans every consumer route — the
// user can add an item, navigate away to browse more vendors, and come back
// to /cart with their selection intact.
export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
