import { RoleGate } from '@/components/auth/RoleGate';

// Auth-gated subtree — see vendor/layout.tsx for the rationale.
export const metadata = {
  title: 'TChopNow — Livreur',
  robots: { index: false, follow: false },
};

// Per DESIGN.md §2 surfaces: rider app is dark-by-default for outdoor
// readability under Cameroon sun + protects driver night-vision. Deep ink
// background, dark-surface cards. WCAG AAA contrast on critical CTAs.
//
// RoleGate wrap (Phase D2 — security audit close-out) prevents the dark
// chrome from flashing for non-rider visitors. proxy.ts already bounces
// anonymous traffic at the edge; this catches the "authenticated as
// CONSUMER but typed /livreur" + "stale JWT" cases. Loading fallback is
// dark to match the surface so transitions feel intentional.
export default function LivreurLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate
      expectedRole="RIDER"
      loadingFallback={
        <div className="flex min-h-dvh items-center justify-center bg-chop-deep-ink text-white/40">
          <div className="h-6 w-6 animate-pulse rounded-full bg-chop-dark-surface" aria-hidden />
        </div>
      }
    >
      <div className="min-h-dvh bg-chop-deep-ink text-white">
        <header
          className="sticky top-0 z-30 border-b border-chop-dark-border bg-chop-deep-ink/95 px-4 py-3 backdrop-blur"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
        >
          <span className="text-sm font-extrabold uppercase tracking-widest text-chop-red">
            TChopNow · Livreur
          </span>
        </header>
        <div className="container max-w-md px-4 py-6">{children}</div>
      </div>
    </RoleGate>
  );
}
