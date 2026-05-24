'use client';

import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';

/**
 * Route-segment error boundary (Next.js App Router convention).
 *
 * Catches uncaught errors thrown during render in any descendant
 * route of `app/`. The previous behavior was Next.js's default
 * dev-mode overlay → bare white screen in production. Now users see
 * a branded recovery card with a "Réessayer" CTA + escape hatches.
 *
 * Does NOT catch errors in app/layout.tsx itself — those bubble to
 * app/global-error.tsx (one tier up, no shared chrome).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Sentry capture: when NEXT_PUBLIC_SENTRY_DSN is set, the SDK
    // ships the error + the `digest` (so we can map user-reported
    // "Code: xyz789" tickets back to the actual stack via Sentry's
    // dashboard). Inert when DSN is empty.
    Sentry.captureException(error, {
      tags: { source: 'route-error', digest: error.digest ?? 'none' },
    });
    // Keep the console line for local dev where Sentry isn't wired.

    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-chop-warm px-5 text-center text-chop-ink">
      <div className="max-w-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-chop-red">— Oups</p>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">
          Quelque chose a cassé.
        </h1>
        <p className="mt-2 text-sm text-chop-ink-secondary">
          Ce n&apos;est pas toi — c&apos;est nous. Réessaie, et si ça persiste, écris-nous.
        </p>
        {error.digest ? (
          <p className="mt-3 inline-block rounded-full bg-chop-surface-gray px-3 py-1 font-mono text-[11px] text-chop-ink-secondary">
            Code : {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" onClick={reset} className="w-full">
            Réessayer
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/restaurants">Retour à l&apos;accueil</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
