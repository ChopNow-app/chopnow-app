'use client';

// React 19's `react-hooks/set-state-in-effect` rule trips on the
// localStorage-on-mount pattern below. We read once on first mount to
// hydrate the dismissed state from per-device storage; there's no
// SSR-readable equivalent for localStorage, so the effect IS the right
// place. Same precedent as features/consumer/components/HomeHeader.tsx.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { X, Gift } from 'lucide-react';

const STORAGE_KEY = 'chopnow.promo.bienvenue.dismissed';

/**
 * Pilot launch promo banner — free delivery on the first order with
 * code BIENVENUE. Sits in document flow at the top of every consumer
 * surface (/, /restaurants, /cart, /orders, /account, /vendors/[id])
 * via (consumer)/layout.tsx. Auto-hidden on actor surfaces (/admin,
 * /vendor, /livreur) because they live outside the (consumer) group.
 *
 * # Coupon enforcement
 * Backed by the chopnow-api coupon system (#167). The user types
 * BIENVENUE into the /cart "Code promo" input; backend validates
 * atomically inside the order-creation transaction and applies the
 * delivery-fee waiver. No manual admin operation is required.
 *
 * The BIENVENUE row itself is seeded on every staging deploy
 * (cd-staging.yml runs prisma/seed-coupons.ts as an idempotent upsert)
 * so the launch funnel can never break due to a missing row.
 *
 * # Dismissal
 * Stored in localStorage under `chopnow.promo.bienvenue.dismissed`.
 * Per-device, no auth required. Banner returns true (hidden) by default
 * to avoid SSR/CSR flash — the effect flips it on mount for non-dismissed
 * visitors.
 */
export function LaunchPromoBanner() {
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setDismissed(true);
  };

  return (
    <div className="relative z-10 border-b border-chop-red/20 bg-chop-ink text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2 md:px-8 lg:px-12">
        <Gift
          className="hidden h-4 w-4 shrink-0 text-chop-red sm:inline-block"
          strokeWidth={2.2}
          aria-hidden
        />
        <p className="flex-1 text-center text-[12px] font-semibold leading-snug md:text-[13px]">
          <span className="font-extrabold uppercase tracking-wider text-chop-red">
            Offre de lancement
          </span>
          <span aria-hidden> · </span>
          Livraison gratuite pour ta première commande
          <span className="hidden md:inline">
            <span aria-hidden> · </span>
            Code{' '}
            <code className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider">
              BIENVENUE
            </code>
          </span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer l'offre de lancement"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
