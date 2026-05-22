'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

const MIN_SPLASH_MS = 700;
const SAFE_DESTINATIONS = new Set(['/restaurants', '/vendor', '/livreur', '/admin']);

/**
 * Hands off from the splash to the real route after a deliberate
 * brand beat. Resolves the destination in this order:
 *
 *   1. ?then=<path> if the path is in the safe-destinations allow-list
 *      (prevents a hostile link from redirecting users out of the app)
 *   2. The authenticated user's role from localStorage cache —
 *      populated by login, RoleRedirector, and useCurrentUser. Fast path,
 *      no network call needed.
 *   3. /users/me fetch as the cold-start fallback — covers the first
 *      launch after install when nothing has populated the role cache
 *      yet (vendor / rider tapped Add-to-Home-Screen mid-session, then
 *      relaunched from the icon before navigating elsewhere).
 *   4. /restaurants — anonymous default.
 *
 * The splash holds for at least MIN_SPLASH_MS so the logo doesn't
 * flicker on fast networks. If the role resolution is slower (e.g.
 * /users/me on 3G), the splash holds until we have an answer, then
 * hands off.
 */
export function LaunchRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    const handoff = (target: string) => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
      window.setTimeout(() => {
        if (!cancelled) router.replace(target);
      }, wait);
    };

    // 1. Explicit ?then= override (safe-list gated).
    const then = searchParams.get('then');
    const safeThen = then && SAFE_DESTINATIONS.has(then) ? then : null;
    if (safeThen) {
      handoff(safeThen);
      return;
    }

    // 2. Anonymous → consumer catalogue (the app's default home).
    if (!auth.isAuthenticated()) {
      handoff('/restaurants');
      return;
    }

    // 3. Cached role → instant redirect, zero network.
    const cached = auth.getRole();
    if (cached) {
      handoff(redirectPathForRole(cached));
      return;
    }

    // 4. Cold-start fallback: fetch the role. Worst case the splash
    //    holds for the network latency, which on staging Cameroon is
    //    typically 200-500ms — still inside the perceived "splash
    //    beat" budget. On 401 we clear the stale token and route to
    //    /restaurants as anonymous.
    apiRaw
      .get<{ role: UserRole }>('/api/users/me')
      .then((me) => {
        if (cancelled) return;
        auth.saveRole(me.role);
        handoff(redirectPathForRole(me.role));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          auth.clear();
        }
        handoff('/restaurants');
      });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return null;
}
