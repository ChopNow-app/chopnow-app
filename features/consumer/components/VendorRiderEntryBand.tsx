'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Discreet footer band on /restaurants pointing visitors to the vendor
 * and rider onboarding flows.
 *
 * Why this exists: when a user installs the PWA and lands on
 * /restaurants (via the launch redirect), the marketing splash's
 * "Tu es ? / Je vends / Je livre" role picker is bypassed — so a
 * brand-new aspiring vendor or rider would have no in-app path to
 * /vendre or /livrer. This band restores that discovery without
 * gating launch on a full role picker.
 *
 * Visual weight is intentionally low: muted background, single line
 * of copy, two pill links. Designed to live below the last "Près de
 * toi" / "Tout Douala" section so consumers who are already engaged
 * with the catalogue don't have it competing for attention.
 */
export function VendorRiderEntryBand() {
  return (
    <section aria-label="Devenir vendeur ou livreur" className="mt-10 px-5 pb-2 md:px-8 lg:px-12">
      <div className="rounded-3xl border border-divider bg-chop-card-white p-5 shadow-card sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-chop-ink-secondary">
          Tu n&apos;es pas client&nbsp;?
        </p>
        <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-chop-ink sm:text-2xl">
          Rejoins ChopNow comme vendeur ou livreur.
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-chop-ink-secondary">
          Tu cuisines déjà, ou tu roules en moto&nbsp;? Inscris-toi gratuitement et commence à
          gagner avec les commandes de ton quartier.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/vendre"
            className="group inline-flex items-center justify-between gap-3 rounded-full bg-chop-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red sm:flex-1"
          >
            <span>Je vends mes plats</span>
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.4}
              aria-hidden
            />
          </Link>
          <Link
            href="/livrer"
            className="group inline-flex items-center justify-between gap-3 rounded-full bg-chop-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red sm:flex-1"
          >
            <span>Je livre à moto</span>
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.4}
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
