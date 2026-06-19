/**
 * Phase B1 — boot-time session rehydration.
 *
 * On every cold app load, exchange the HttpOnly `chopnow_rt` refresh cookie
 * for a fresh in-memory access token. Until this completes, UI that depends
 * on `useSession()` shows a 'booting' state instead of flashing "anonymous"
 * + redirecting to /login.
 *
 * Migration: if the cookie path 401s but the user has a legacy
 * `chopnow.refresh` value in localStorage (from before Phase B1 shipped),
 * we try once with that token in the body. On success the backend issues a
 * fresh cookie + we wipe the legacy localStorage entries.
 *
 * Phase D1: admins now go through the same cookie path as consumers — no
 * more `chopnow.admin.token` localStorage seed needed. The legacy key is
 * actively wiped on boot so XSS can't read a stale long-lived bearer.
 */

import { accessTokenStore } from './access-token-store';
import { setAuthHintCookie, clearAuthHintCookie } from './auth-hint';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const LEGACY_ACCESS_KEY = 'chopnow.access';
const LEGACY_REFRESH_KEY = 'chopnow.refresh';
// Phase D1 — admins now ride the same cookie + memory model as consumers.
// The legacy key (set by chopnow-app pre-D1) is wiped on boot below.
const LEGACY_ADMIN_KEY = 'chopnow.admin.token';

export type BootStatus = 'pending' | 'authenticated' | 'anonymous';

type Listener = (status: BootStatus) => void;

let status: BootStatus = 'pending';
let inflight: Promise<BootStatus> | null = null;
const listeners = new Set<Listener>();

function setStatus(next: BootStatus) {
  if (next === status) return;
  status = next;
  for (const l of listeners) l(next);
}

async function callRefresh(body?: {
  refreshToken: string;
}): Promise<{ accessToken: string } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : '{}',
    });
    if (!res.ok) return null;
    return (await res.json()) as { accessToken: string };
  } catch {
    return null;
  }
}

/**
 * Cross-tab sync handler (Phase D2 — security audit close-out).
 *
 * When another tab broadcasts `auth-changed`, this tab calls its own
 * /auth/refresh to fetch a fresh access token (or learn it's been
 * logged out). The broadcast itself carries NO token — see the
 * security note in access-token-store.ts.
 *
 * Sets broadcast:false on the resulting store update so we don't
 * re-broadcast and create a ping-pong loop with the originating tab.
 */
let crossTabRefreshInFlight: Promise<void> | null = null;
async function handleCrossTabAuthChange(): Promise<void> {
  if (crossTabRefreshInFlight) return crossTabRefreshInFlight;
  crossTabRefreshInFlight = (async () => {
    const result = await callRefresh();
    accessTokenStore.set(result?.accessToken ?? null, { broadcast: false });
    setStatus(result?.accessToken ? 'authenticated' : 'anonymous');
  })().finally(() => {
    crossTabRefreshInFlight = null;
  });
  return crossTabRefreshInFlight;
}

export function getBootStatus(): BootStatus {
  return status;
}

export function subscribeBootStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Idempotent — safe to call from multiple mount points. The first call
 * does the network work; concurrent calls share the same promise.
 */
export function bootRehydrate(): Promise<BootStatus> {
  if (typeof window === 'undefined') return Promise.resolve('anonymous');
  if (status !== 'pending') return Promise.resolve(status);
  if (inflight) return inflight;

  // One-time wire of the cross-tab handler. accessTokenStore is module-
  // singleton so registering once is sufficient for the app lifetime.
  accessTokenStore.setCrossTabHandler(handleCrossTabAuthChange);

  inflight = (async () => {
    // 1) Cookie path — the common case post-migration.
    const cookieResult = await callRefresh();
    if (cookieResult?.accessToken) {
      accessTokenStore.set(cookieResult.accessToken);
      // Legacy localStorage tokens are no longer trusted — wipe them so
      // an XSS bug can't read them.
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.removeItem(LEGACY_REFRESH_KEY);
      // Keep the middleware hint in sync: a valid refresh means an active
      // session. This handles page reloads where adminLogin() wasn't called.
      setAuthHintCookie();
      setStatus('authenticated');
      return 'authenticated' as const;
    }

    // 2) Legacy refresh migration — one-shot, only fires for users who
    //    were logged in before this PR shipped.
    const legacyRefresh = window.localStorage.getItem(LEGACY_REFRESH_KEY);
    if (legacyRefresh) {
      const migrated = await callRefresh({ refreshToken: legacyRefresh });
      window.localStorage.removeItem(LEGACY_REFRESH_KEY);
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      if (migrated?.accessToken) {
        accessTokenStore.set(migrated.accessToken);
        setAuthHintCookie();
        setStatus('authenticated');
        return 'authenticated' as const;
      }
    }

    // Phase D1 — wipe any pre-D1 admin token sitting in localStorage so
    // an XSS on /admin/* can't steal it. Admins authenticate fresh after
    // the cutover deploy; their cookie + memory model takes over from
    // the next sign-in.
    window.localStorage.removeItem(LEGACY_ADMIN_KEY);

    // No valid session — clear the middleware hint so /admin/* redirects
    // to login instead of reaching component-level 401 panels.
    clearAuthHintCookie();

    setStatus('anonymous');
    return 'anonymous' as const;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/**
 * Test-only — reset the module's static state between tests. Not exported
 * from the package barrel.
 */
export function __resetBootForTests() {
  status = 'pending';
  inflight = null;
  crossTabRefreshInFlight = null;
  listeners.clear();
  accessTokenStore.setCrossTabHandler(null);
}
