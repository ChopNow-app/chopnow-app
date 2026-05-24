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
 * Cross-tab coordination uses `BroadcastChannel('chopnow_auth')`.
 *
 * # Security note (Phase D2, security audit 2026-05-24)
 *
 * The channel deliberately **does NOT carry the access token in the
 * message body**. A previous design sent `{ accessToken }` so other tabs
 * could reuse the freshly-minted token without their own /auth/refresh
 * roundtrip. That's a defense-in-depth gap: an XSS in any same-origin
 * third-party widget (Mapbox tile loader, Turnstile iframe escape, an
 * inline ad SDK if we ever add one) can listen on the channel and
 * exfiltrate the token from sibling tabs.
 *
 * The hardened model broadcasts only `{ type: 'auth-changed' }` and lets
 * each tab decide what to do — typically calling its own /auth/refresh
 * via the registered `onCrossTabChange` callback (wired in boot.ts).
 * Extra refresh roundtrip on cross-tab login is a trivial cost at pilot
 * scale; bigger payoff is the token never traveling on the channel.
 */

type Listener = (token: string | null) => void;
type CrossTabHandler = () => void;

type BroadcastMessage = { type: 'auth-changed' };

let accessToken: string | null = null;
const listeners = new Set<Listener>();
let crossTabHandler: CrossTabHandler | null = null;
let channel: BroadcastChannel | null = null;

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!channel) {
    channel = new BroadcastChannel('chopnow_auth');
    channel.onmessage = (event) => {
      const data = event.data as BroadcastMessage | null;
      // Defensive: ignore unrecognized messages (e.g. pre-D2 payloads
      // from a still-open tab on an old version during a rolling deploy).
      if (!data || data.type !== 'auth-changed') return;
      crossTabHandler?.();
    };
  }
  return channel;
}

function notify(broadcast: boolean) {
  for (const l of listeners) l(accessToken);
  if (broadcast) {
    const ch = ensureChannel();
    // Body is intentionally token-free — see Security note above.
    ch?.postMessage({ type: 'auth-changed' } satisfies BroadcastMessage);
  }
}

export const accessTokenStore = {
  get(): string | null {
    return accessToken;
  },

  /**
   * Set the access token. Defaults to broadcasting to other tabs so they
   * stay in sync — pass `broadcast: false` when reacting to an incoming
   * broadcast (or an in-tab refresh that other tabs already triggered)
   * to avoid ping-pong.
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

  /**
   * Register the handler invoked when ANOTHER tab broadcasts that its
   * auth state changed (login/logout/refresh). Wired from boot.ts to
   * re-run the refresh flow so this tab picks up the new token via its
   * own /auth/refresh call — the token never travels on the channel.
   */
  setCrossTabHandler(handler: CrossTabHandler | null): void {
    crossTabHandler = handler;
    if (handler) ensureChannel();
  },
};
