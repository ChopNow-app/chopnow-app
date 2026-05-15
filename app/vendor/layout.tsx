export const metadata = { title: 'ChopNow — Vendeur' };

// Per DESIGN.md §1: vendor surface is "fonctionnel, dense, efficace —
// Linear/Notion vibes". Tighter spacing than consumer/livreur; designed
// for a laptop or tablet in a busy kitchen, not for thumb-tapping.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chop-surface-gray">
      <header className="sticky top-0 z-30 border-b border-divider bg-chop-card-white px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-chop-card-white/90">
        <div className="container flex max-w-5xl items-center gap-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-chop-orange">
            ChopNow · Vendeur
          </span>
        </div>
      </header>
      <div className="container max-w-5xl py-4">{children}</div>
    </div>
  );
}
