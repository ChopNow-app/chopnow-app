import { apiRaw, ApiClientError } from '@/lib/api/api-client';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AdminLoginResult {
  accessToken: string;
  role: AdminRole;
  email: string;
  expiresIn: number;
}

const ACCESS_KEY = 'chopnow.access';

/**
 * Story 1.6 — admin login. Email + argon2id password (no OTP). The backend
 * returns only an access token (8h TTL, no refresh) — admin re-enters at
 * session end. We persist it under the same key as consumer tokens so the
 * existing `authMiddleware` attaches it automatically.
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  try {
    const result = await apiRaw.post<AdminLoginResult>('/api/admin/auth/login', {
      email,
      password,
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCESS_KEY, result.accessToken);
      // Wipe any consumer refresh token — admin sessions don't carry one,
      // and a stale consumer refresh would otherwise trigger refresh-on-401.
      window.localStorage.removeItem('chopnow.refresh');
      window.localStorage.setItem('chopnow.admin.role', result.role);
      window.localStorage.setItem('chopnow.admin.email', result.email);
    }
    return result;
  } catch (err) {
    if (err instanceof ApiClientError) {
      const body = err.body as { code?: string; message?: string } | undefined;
      const code = body?.code;
      let msg = body?.message ?? `Erreur ${err.status}`;
      if (code === 'invalid_credentials') msg = 'Email ou mot de passe incorrect.';
      else if (code === 'account_locked')
        msg = 'Compte verrouillé après trop de tentatives. Contacte un super-admin.';
      const wrapped = new Error(msg);
      (wrapped as Error & { code?: string }).code = code;
      throw wrapped;
    }
    throw err;
  }
}

export function adminRole(): AdminRole | null {
  if (typeof window === 'undefined') return null;
  return (window.localStorage.getItem('chopnow.admin.role') as AdminRole | null) ?? null;
}
export function adminEmail(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('chopnow.admin.email');
}
export function adminLogout() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem('chopnow.admin.role');
  window.localStorage.removeItem('chopnow.admin.email');
}

/** Decision payload — `reason` required for reject/suspend, optional otherwise. */
export interface DecisionPayload {
  reason?: string;
}

export const adminApi = {
  approveVendor: (id: string) => apiRaw.post(`/api/admin/vendors/${id}/approve`, {}),
  rejectVendor: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/vendors/${id}/reject`, { reason }),
  suspendVendor: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/vendors/${id}/suspend`, { reason }),
  unsuspendVendor: (id: string) => apiRaw.post(`/api/admin/vendors/${id}/unsuspend`, {}),

  approveRider: (id: string) => apiRaw.post(`/api/admin/riders/${id}/approve`, {}),
  rejectRider: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/riders/${id}/reject`, { reason }),
  suspendRider: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/riders/${id}/suspend`, { reason }),
  unsuspendRider: (id: string) => apiRaw.post(`/api/admin/riders/${id}/unsuspend`, {}),
};
