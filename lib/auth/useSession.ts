'use client';

import { useSyncExternalStore } from 'react';
import { accessTokenStore } from './access-token-store';
import { getBootStatus, subscribeBootStatus, type BootStatus } from './boot';

export type SessionState =
  | { status: 'booting' }
  | { status: 'authenticated'; accessToken: string }
  | { status: 'anonymous' };

interface Snapshot {
  boot: BootStatus;
  accessToken: string | null;
}

function getSnapshot(): Snapshot {
  return { boot: getBootStatus(), accessToken: accessTokenStore.get() };
}

let cached: Snapshot = getSnapshot();
// useSyncExternalStore expects a *stable* snapshot reference between
// listeners — we recompute on every change but cache the result so React
// doesn't tear when nothing actually moved.
function readSnapshot(): Snapshot {
  const next = getSnapshot();
  if (next.boot === cached.boot && next.accessToken === cached.accessToken) return cached;
  cached = next;
  return cached;
}

function subscribe(listener: () => void): () => void {
  const offBoot = subscribeBootStatus(() => listener());
  const offToken = accessTokenStore.subscribe(() => listener());
  return () => {
    offBoot();
    offToken();
  };
}

// SSR snapshot — render as booting on the server; the client takes over
// after hydration and resolves to authenticated/anonymous as soon as the
// boot refresh resolves.
const SSR_SNAPSHOT: Snapshot = { boot: 'pending', accessToken: null };
function getServerSnapshot(): Snapshot {
  return SSR_SNAPSHOT;
}

/**
 * Reactive session hook. Three states:
 *   - `booting`        — initial render + while /auth/refresh is in flight
 *   - `authenticated`  — boot resolved with a valid access token
 *   - `anonymous`      — boot resolved with no session
 *
 * Use this in auth-gated UI instead of reading `auth.isAuthenticated()`
 * synchronously — otherwise a returning user with a valid cookie flashes
 * "logged out" for one render.
 */
export function useSession(): SessionState {
  const snap = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
  if (snap.boot === 'pending') return { status: 'booting' };
  if (snap.accessToken) return { status: 'authenticated', accessToken: snap.accessToken };
  return { status: 'anonymous' };
}
