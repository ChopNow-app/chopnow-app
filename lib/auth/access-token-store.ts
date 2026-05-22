/**
 * Phase B1 — in-memory access token store.
 *
 * Before this change the access token sat in `localStorage.chopnow.access`,
 * which any successful XSS could exfiltrate for the full 24h TTL. The new
 * model keeps the (now 15-min) access token in a module-scoped variable —
 * XSS in the same origin can still read it, but it dies on tab close,
 * doesn't survive a hard reload, and is never written to disk.
 *
 * The long-lived authentication is the HttpOnly `chopnow_rt` refresh cookie
 * the backend sets at login + on every refresh. The boot helper
 * (`lib/auth/boot.ts`) calls `/auth/refresh` on app start to mint a fresh
 * access token from the cookie.
 *
 * Subscribers (api-client middleware, useSession hook) listen via
 * `subscribe()` to react to login/logout/refresh.
 *
 * Cross-tab coordination uses `BroadcastChannel('chopnow_auth')`: when one
 * tab refreshes the token, every other tab gets the new value without
 * having to fire its own /auth/refresh.
 */

type Listener = (token: string | null) => void;

let accessToken: string | null = null;
const listeners = new Set<Listener>();
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel('chopnow_auth');
    channel.onmessage = (event) => {
      const next = (event.data as { accessToken?: string | null } | null)?.accessToken ?? null;
      // Don't re-broadcast — only update locally + notify listeners.
      if (next !== accessToken) {
        accessToken = next;
        for (const l of listeners) l(next);
      }
    };
  }
  return channel;
}

function notify(broadcast: boolean) {
  for (const l of listeners) l(accessToken);
  if (broadcast) {
    const ch = ensureChannel();
    ch?.postMessage({ accessToken });
  }
}

export const accessTokenStore = {
  get(): string | null {
    return accessToken;
  },

  /**
   * Set the access token. Defaults to broadcasting to other tabs so they
   * stay in sync — pass `broadcast: false` when reacting to an *incoming*
   * broadcast to avoid ping-pong (handled internally by the channel).
   */
  set(token: string | null, opts: { broadcast?: boolean } = {}): void {
    if (token === accessToken) return;
    accessToken = token;
    notify(opts.broadcast !== false);
  },

  clear(): void {
    this.set(null);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    ensureChannel();
    return () => listeners.delete(listener);
  },
};
