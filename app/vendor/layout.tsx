import { RoleGate } from '@/components/auth/RoleGate';

// Auth-gated subtree: proxy.ts bounces anonymous traffic at the edge so
// crawlers only ever see the /login redirect. Marking robots.index=false
// on the layout signals "don't even try" to compliant crawlers — saves
// budget that would otherwise be spent re-crawling the redirect chain.
export const metadata = {
  title: 'TChopNow — Vendeur',
  robots: { index: false, follow: false },
};

// Per DESIGN.md §1: vendor surface is "fonctionnel, dense, efficace —
// Linear/Notion vibes". Tighter spacing than consumer/livreur; designed
// for a laptop or tablet in a busy kitchen, not for thumb-tapping.
//
// RoleGate wrap (Phase D2 — security audit close-out) prevents the
// chrome from rendering for non-vendor visitors. proxy.ts already bounces
// anonymous traffic at the edge; this catches the "authenticated but
// wrong role" + "stale JWT" cases that the edge can't introspect.
export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate expectedRole="VENDOR">
      <div className="min-h-dvh bg-chop-surface-gray">
        <header className="sticky top-0 z-30 border-b border-divider bg-chop-card-white px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-chop-card-white/90">
          <div className="container flex max-w-5xl items-center gap-3">
            <span className="text-xs font-extrabold uppercase tracking-widest text-chop-red">
              TChopNow · Vendeur
            </span>
          </div>
        </header>
        <div className="container max-w-5xl py-4">{children}</div>
      </div>
    </RoleGate>
  );
}
