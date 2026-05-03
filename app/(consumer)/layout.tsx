// Route group: shared shell for consumer-facing pages (/, /restaurants, /cart, /orders/[id]).
// The folder name `(consumer)` is parenthesised so it does NOT appear in URLs — it groups
// these routes for layout/middleware purposes only.

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
