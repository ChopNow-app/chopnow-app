'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

interface Props {
  /**
   * Optional hard-coded landing override — useful when this island is used
   * inside a role-specific entry point that wants to short-circuit the
   * /users/me roundtrip (e.g. /admin/login already knows the user will be
   * an admin). Defaults to "use the user's actual role".
   */
  fallbackHref?: string;
}

/**
 * Mounted on the public landing page. On cold open:
 *   - Logged out → render nothing, the splash beneath stays visible
 *   - Logged in  → render a full-bleed "Bienvenue, on te ramène à ton
 *                  espace…" overlay while we fetch the role + redirect
 *
 * The overlay hides the splash flicker that would otherwise happen while
 * the network call resolves. Worst case (slow 3G) the user sees the
 * overlay for ~1s before snapping to /vendor / /livreur / /restaurants.
 *
 * Stale-token recovery: a 401 on /users/me clears the local tokens and
 * leaves the splash visible — a returning user with a revoked session
 * cleanly re-enters the role-picker, no "stuck loading" state.
 */
export function RoleRedirector({ fallbackHref }: Props) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<'idle' | 'checking' | 'anonymous'>('idle');

  React.useEffect(() => {
    if (!auth.isAuthenticated()) {
      setPhase('anonymous');
      return;
    }

    let cancelled = false;
    setPhase('checking');

    if (fallbackHref) {
      router.replace(fallbackHref);
      return;
    }

    apiRaw
      .get<{ role: UserRole }>('/api/users/me')
      .then((me) => {
        if (cancelled) return;
        // Persist for the next PWA cold-launch (LaunchRedirector reads
        // this to route vendors / riders to their dashboards instantly).
        auth.saveRole(me.role);
        router.replace(redirectPathForRole(me.role));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          auth.clear();
          setPhase('anonymous');
          return;
        }
        // Network-blip fallback: route to /restaurants — every authed user
        // can land there, and a real network outage will just show the
        // catalogue's own error state.
        router.replace('/restaurants');
      });

    return () => {
      cancelled = true;
    };
  }, [router, fallbackHref]);

  if (phase !== 'checking') return null;

  return (
    <div
      aria-live="polite"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-chop-warm text-chop-ink"
    >
      <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">
        TChop<span className="text-chop-red">Now.</span>
      </span>
      <p className="mt-3 text-sm text-chop-ink-secondary">On te ramène à ton espace…</p>
      <span
        aria-hidden
        className="mt-4 inline-block h-1 w-12 animate-pulse rounded-full bg-chop-red"
      />
    </div>
  );
}
