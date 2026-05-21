'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
 *   2. The authenticated user's role-specific home, if a token is present
 *   3. /restaurants — the consumer default
 *
 * We wait at least MIN_SPLASH_MS so the logo doesn't flicker on fast
 * networks. If the destination is ready sooner, the splash holds; if
 * slower, we hand off as soon as we have an answer.
 */
export function LaunchRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    // The role check is best-effort: if /users/me is slow or fails, we
    // fall through to /restaurants. We deliberately don't await any
    // backend call inside the splash — we just read the locally-cached
    // token + role. The real role-redirect-on-load happens once we
    // hand off (RoleRedirector on /).
    const then = searchParams.get('then');
    const safeThen = then && SAFE_DESTINATIONS.has(then) ? then : null;

    let target = safeThen ?? '/restaurants';
    if (!safeThen && auth.isAuthenticated()) {
      // Token cached locally — peek at the role if we stored it
      // (admin login does; consumer/vendor/rider sessions don't yet,
      // so this is a no-op for them today but ready when we add the
      // role cache).
      const cachedRole =
        typeof window !== 'undefined'
          ? (window.localStorage.getItem('chopnow.admin.role') as UserRole | null)
          : null;
      if (cachedRole) target = redirectPathForRole(cachedRole);
    }

    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    const timer = window.setTimeout(() => {
      if (!cancelled) router.replace(target);
    }, wait);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, searchParams]);

  return null;
}
