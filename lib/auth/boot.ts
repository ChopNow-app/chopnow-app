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
 * Admin path: admins have no refresh token. If they have a stashed access
 * token in `chopnow.admin.token`, we seed the memory store from it — the
 * 8h TTL is enforced server-side; a stale one will 401 on first use and
 * the user is bounced to /admin/login by the usual flow.
 */

import { accessTokenStore } from './access-token-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const LEGACY_ACCESS_KEY = 'chopnow.access';
const LEGACY_REFRESH_KEY = 'chopnow.refresh';
const ADMIN_ACCESS_KEY = 'chopnow.admin.token';

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

  inflight = (async () => {
    // 1) Cookie path — the common case post-migration.
    const cookieResult = await callRefresh();
    if (cookieResult?.accessToken) {
      accessTokenStore.set(cookieResult.accessToken);
      // Legacy localStorage tokens are no longer trusted — wipe them so
      // an XSS bug can't read them.
      window.localStorage.removeItem(LEGACY_ACCESS_KEY);
      window.localStorage.removeItem(LEGACY_REFRESH_KEY);
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
        setStatus('authenticated');
        return 'authenticated' as const;
      }
    }

    // 3) Admin fallback — admin sessions are access-only (no refresh).
    //    A persisted access token survives reload; let it through and the
    //    next 401 will clear it.
    const adminAccess = window.localStorage.getItem(ADMIN_ACCESS_KEY);
    if (adminAccess) {
      accessTokenStore.set(adminAccess);
      setStatus('authenticated');
      return 'authenticated' as const;
    }

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
  listeners.clear();
}
