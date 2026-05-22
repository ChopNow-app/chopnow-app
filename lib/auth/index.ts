import { apiRaw } from '@/lib/api/api-client';
import type { UserRole } from '@/lib/auth/role-redirect';

const ACCESS_KEY = 'chopnow.access';
const REFRESH_KEY = 'chopnow.refresh';
// Cached broad UserRole — read by LaunchRedirector to send vendors /
// riders to their dashboard on PWA cold-launch without waiting on a
// /users/me roundtrip. Kept fresh by login, RoleRedirector, and the
// useCurrentUser query whenever they successfully resolve the role.
const ROLE_KEY = 'chopnow.user.role';

const VALID_ROLES: ReadonlySet<UserRole> = new Set([
  'CONSUMER',
  'VENDOR',
  'RIDER',
  'ADMIN',
  'SUPER_ADMIN',
]);

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export const auth = {
  saveTokens(tokens: AuthTokens) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
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
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(ROLE_KEY);
  },
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  // --- API calls ---
  async requestOtp(phone: string) {
    return apiRaw.post<{ ok: true; expiresInSeconds: number }>('/api/auth/request-otp', { phone });
  },
  async verifyOtp(phone: string, code: string) {
    const tokens = await apiRaw.post<AuthTokens>('/api/auth/verify-otp', { phone, code });
    this.saveTokens(tokens);
    return tokens;
  },
  async logout() {
    this.clear();
  },
};
