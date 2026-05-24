'use client';

import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

/**
 * Client-side route guard for actor-specific layouts.
 *
 * Layered defense:
 *   1. proxy.ts (edge) — bounces anonymous requests to /login before any
 *      client code runs. That's the primary gate.
 *   2. <RoleGate> (client, this file) — catches the post-edge cases:
 *        - user has a cookie but the JWT is stale/expired
 *        - user is a CONSUMER trying to render /vendor (correct role
 *          but wrong scope)
 *        - someone clears the proxy by hand or downloads the page bundle
 *      Renders a branded loading shell during boot + redirect, so users
 *      never see flashes of the wrong dashboard's chrome.
 *   3. backend (@Roles decorator) — the real security boundary. Every
 *      API call validates the JWT + role server-side.
 *
 * The cost of this component is two render cycles on slow boot, no
 * network calls (it piggybacks on `useCurrentUser()` which the rest of
 * the app already calls).
 */
export function RoleGate({
  expectedRole,
  children,
  loadingFallback,
}: {
  /** Single role or array of roles allowed to view this subtree. */
  expectedRole: UserRole | UserRole[];
  children: React.ReactNode;
  /** Optional skeleton to show while the auth check runs. Defaults to a
   *  bare branded placeholder so the role-specific chrome doesn't flash. */
  loadingFallback?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useCurrentUser();

  const allowed = React.useMemo(() => {
    const list = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    return new Set(list);
  }, [expectedRole]);

  // Compute the destination once per state change. Falsy = stay.
  const destination = React.useMemo(() => {
    if (me.status === 'loading') return null;
    if (me.status === 'anonymous') {
      const next = encodeURIComponent(pathname);
      return `/login?next=${next}`;
    }
    if (me.status === 'error') return '/restaurants';
    // authenticated:
    return allowed.has(me.user.role) ? null : redirectPathForRole(me.user.role);
  }, [me, pathname, allowed]);

  React.useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  if (me.status === 'authenticated' && allowed.has(me.user.role)) {
    return <>{children}</>;
  }

  // Loading + redirecting branches render the fallback so the layout
  // chrome (vendor header, livreur dark band, etc.) doesn't flash before
  // the redirect fires. Default fallback is intentionally bare — just
  // enough so the page isn't blank.
  return (
    <>
      {loadingFallback ?? (
        <div className="flex min-h-dvh items-center justify-center bg-chop-warm text-chop-ink-secondary">
          <div className="h-6 w-6 animate-pulse rounded-full bg-chop-surface-gray" aria-hidden />
        </div>
      )}
    </>
  );
}
