import { apiRaw } from '@/lib/api/api-client';
import { accessTokenStore } from '@/lib/auth/access-token-store';
import type { UserRole } from '@/lib/auth/role-redirect';

// Phase B1 — the refresh token lives in the HttpOnly `chopnow_rt` cookie
// the backend sets at verify-otp / refresh / login. JavaScript can't read
// it, so it isn't here. The (now 15-min) access token lives in
// `accessTokenStore` — pure memory, no disk.
//
// `chopnow.user.role` stays in localStorage on purpose: it's a non-secret
// UX hint that lets the splash route vendors / riders to their dashboards
// instantly on cold launch, before the boot refresh has resolved. A
// hostile reader of it learns at most "this device last logged in as a
// VENDOR" — no session capability.
const ROLE_KEY = 'chopnow.user.role';

const VALID_ROLES: ReadonlySet<UserRole> = new Set([
  'CONSUMER',
  'VENDOR',
  'RIDER',
  'ADMIN',
  'SUPER_ADMIN',
]);

export interface AuthTokens {
  /** Short-lived (15-min) JWT — server returns it in the body so the
   *  PWA can put it straight into the in-memory store. */
  accessToken: string;
  /** Optional — backend now sets the refresh token via HttpOnly cookie.
   *  Kept here only because /auth/verify-otp still returns it in the
   *  body for backwards-compat; we deliberately drop it on the floor. */
  refreshToken?: string;
}

export const auth = {
  /**
   * Store the access token in memory. The refresh side travels via the
   * HttpOnly cookie set by the same backend response — nothing to do
   * client-side.
   */
  saveTokens(tokens: AuthTokens) {
    accessTokenStore.set(tokens.accessToken);
  },
  getAccessToken(): string | null {
    return accessTokenStore.get();
  },
  saveRole(role: UserRole) {
    if (typeof window === 'undefined') return;
    if (!VALID_ROLES.has(role)) return;
    localStorage.setItem(ROLE_KEY, role);
  },
  getRole(): UserRole | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(ROLE_KEY) as UserRole | null;
    if (!raw || !VALID_ROLES.has(raw)) return null;
    return raw;
  },
  /** Drop the in-memory access token + role hint. Does NOT clear the
   *  refresh cookie — call `auth.logout()` for a real sign-out. */
  clear() {
    accessTokenStore.clear();
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ROLE_KEY);
  },
  isAuthenticated(): boolean {
    return !!accessTokenStore.get();
  },

  // --- API calls ---
  // captchaToken is sent only when the consumer surface has the
  // Turnstile widget enabled (NEXT_PUBLIC_CAPTCHA_ENABLED=true). When
  // the backend's matching CAPTCHA_ENABLED is false the field is
  // ignored; when true and the token is absent the request fails 403.
  async requestOtp(phone: string, captchaToken?: string | null) {
    const body: { phone: string; cfTurnstileResponse?: string } = { phone };
    if (captchaToken) body.cfTurnstileResponse = captchaToken;
    return apiRaw.post<{ ok: true; expiresInSeconds: number }>('/api/auth/request-otp', body);
  },
  async verifyOtp(phone: string, code: string) {
    const tokens = await apiRaw.post<AuthTokens>('/api/auth/verify-otp', { phone, code });
    this.saveTokens(tokens);
    return tokens;
  },
  /**
   * Server-side revoke + cookie wipe. We don't need to send a body — the
   * cookie carries the refresh token, and the backend is idempotent
   * (unknown / expired tokens still 204). After this resolves the user is
   * fully signed out: no access in memory, no refresh cookie, no role.
   */
  async logout() {
    try {
      await apiRaw.post('/api/v1/auth/logout', {});
    } catch {
      // Swallow — a network blip mid-logout shouldn't strand the user in
      // a logged-in UI. We still wipe locally; worst case the cookie
      // lingers server-side until its 30-day TTL, but that row is
      // single-use + reuse-detected so it can't be replayed.
    }
    this.clear();
  },
};
