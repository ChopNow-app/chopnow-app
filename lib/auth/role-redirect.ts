export type UserRole = 'CONSUMER' | 'VENDOR' | 'RIDER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * Where to send a freshly-authenticated user based on their role.
 *
 * Used by:
 *  - `/` (the landing page) — auto-redirect on cold open if a session exists
 *  - `/login` — after a successful OTP verify
 *
 * The vendor + rider have dedicated dashboards. The consumer surface is
 * `/restaurants` (the catalogue is the home, not the marketing splash). Admins
 * go to their own console.
 *
 * Unknown roles fall back to `/restaurants` — the safest surface for any
 * authenticated phone (they can still browse + order food while we figure out
 * who they're supposed to be).
 */
export function redirectPathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case 'VENDOR':
      return '/vendor';
    case 'RIDER':
      return '/livreur';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'CONSUMER':
    default:
      return '/restaurants';
  }
}
