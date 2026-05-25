import { ClipboardList, UtensilsCrossed, Clock, User } from 'lucide-react';
import { ActorTabNav, type ActorTab } from '@/components/ActorTabNav';
import { RoleGate } from '@/components/auth/RoleGate';

// Auth-gated subtree: proxy.ts bounces anonymous traffic at the edge so
// crawlers only ever see the /login redirect. Marking robots.index=false
// on the layout signals "don't even try" to compliant crawlers — saves
// budget that would otherwise be spent re-crawling the redirect chain.
export const metadata = {
  title: 'TChopNow — Vendeur',
  robots: { index: false, follow: false },
};

// Vendor tabs — 4 entry points for the operator dashboard. Order chosen
// by "frequency of use during a typical shift": incoming Commandes first
// (the kitchen's whole reason for the app), then Menu management, then
// Horaires (open/close), then Profil (rare edits).
const VENDOR_TABS: ActorTab[] = [
  {
    href: '/vendor',
    label: 'Commandes',
    icon: <ClipboardList className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p === '/vendor',
  },
  {
    href: '/vendor/menu',
    label: 'Menu',
    icon: <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/menu'),
  },
  {
    href: '/vendor/hours',
    label: 'Horaires',
    icon: <Clock className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/hours'),
  },
  {
    href: '/vendor/profile',
    label: 'Profil',
    icon: <User className="h-4 w-4" strokeWidth={2} />,
    match: (p) => p.startsWith('/vendor/profile'),
  },
];

// Hide the tabs on full-screen takeover routes — /vendor/commande/[id]
// (60s accept countdown) and /vendor/preparation/[id] (active cook view)
// both intentionally fill the viewport with one focused task. The tabs
// would dilute the urgency, so suppress.
const HIDE_TABS_ON = [/^\/vendor\/commande\//, /^\/vendor\/preparation\//];

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
          <div className="container flex max-w-5xl items-center gap-4">
            <span className="shrink-0 text-xs font-extrabold uppercase tracking-widest text-chop-red">
              TChopNow · Vendeur
            </span>
            <ActorTabNav tabs={VENDOR_TABS} hideOn={HIDE_TABS_ON} ariaLabel="Sections vendeur" />
          </div>
        </header>
        <div className="container max-w-5xl py-4">{children}</div>
      </div>
    </RoleGate>
  );
}
