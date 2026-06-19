/**
 * Non-secret presence cookie on the Next.js domain (app.tchopnow.app) used
 * by the proxy.ts edge middleware to detect an active admin session.
 *
 * Why this exists: the real auth cookie (`chopnow_rt`) is HttpOnly and set by
 * the API on a different subdomain (api-staging.tchopnow.app). The edge
 * middleware runs on the Next.js domain and cannot read cross-subdomain cookies,
 * so it can never see `chopnow_rt`. This hint cookie bridges the gap — it carries
 * no secret, just signals "a login succeeded recently." Security is still
 * enforced by the API on every request; the middleware is a UX layer only.
 */

export const AUTH_HINT_COOKIE = 'chopnow_auth_hint';

export function setAuthHintCookie(): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${AUTH_HINT_COOKIE}=1; path=/; max-age=86400; samesite=strict${secure}`;
}

export function clearAuthHintCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_HINT_COOKIE}=; path=/; max-age=0; samesite=strict`;
}
