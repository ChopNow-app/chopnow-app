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
  // #187 follow-up — toggle the vendor's pre-order opt-in. Idempotent
  // server-side, so retries / double-taps don't surprise.
  setVendorPreOrders: (id: string, acceptsPreOrders: boolean) =>
    apiRaw.patch(`/api/admin/vendors/${id}/pre-orders`, { acceptsPreOrders }),

  approveRider: (id: string) => apiRaw.post(`/api/admin/riders/${id}/approve`, {}),
  rejectRider: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/riders/${id}/reject`, { reason }),
  suspendRider: (id: string, reason: string) =>
    apiRaw.post(`/api/admin/riders/${id}/suspend`, { reason }),
  unsuspendRider: (id: string) => apiRaw.post(`/api/admin/riders/${id}/unsuspend`, {}),
};

// ── Finance dashboard (ADR-0005, S2) ────────────────────────────────

export interface VendorBalanceRow {
  vendorId: string;
  name: string;
  type: 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
  status: 'PENDING_REVIEW' | 'CORRECTION_REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  balanceXAF: number;
  isTrusted: boolean;
  lastPayoutAt: string | null;
}

export interface RiderBalanceRow {
  riderId: string;
  name: string | null;
  vehicleType: 'MOTO' | 'BICYCLE' | 'CAR' | 'ON_FOOT';
  balanceXAF: number;
  lastPayoutAt: string | null;
}

export interface RefundQueueRow {
  orderId: string;
  code: string;
  vendorId: string;
  vendorName: string;
  userId: string;
  totalXAF: number;
  ageDays: number;
  cancelledAt: string | null;
}

export type CashoutRequestStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CashoutRequestRow {
  requestId: string;
  vendorId: string;
  vendorName: string;
  vendorType: 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
  requestedXAF: number;
  status: CashoutRequestStatus;
  createdAt: string;
  ageHours: number;
  isTrusted: boolean;
}

export interface PagedResult<T> {
  total: number;
  rows: T[];
}

export const adminFinanceApi = {
  listVendorBalances: (params?: {
    status?: string;
    type?: string;
    minBalanceXAF?: number;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.minBalanceXAF !== undefined) qs.set('minBalanceXAF', String(params.minBalanceXAF));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRaw.get<PagedResult<VendorBalanceRow>>(`/api/admin/finance/vendor-balances${suffix}`);
  },
  listRiderBalances: (params?: {
    vehicleType?: string;
    minBalanceXAF?: number;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.vehicleType) qs.set('vehicleType', params.vehicleType);
    if (params?.minBalanceXAF !== undefined) qs.set('minBalanceXAF', String(params.minBalanceXAF));
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRaw.get<PagedResult<RiderBalanceRow>>(`/api/admin/finance/rider-balances${suffix}`);
  },
  listRefundQueue: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRaw.get<PagedResult<RefundQueueRow>>(`/api/admin/finance/refund-queue${suffix}`);
  },
  listCashoutRequests: (params?: {
    status?: CashoutRequestStatus;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRaw.get<PagedResult<CashoutRequestRow>>(
      `/api/admin/finance/cashout-requests${suffix}`,
    );
  },
  approveCashoutRequest: (requestId: string) =>
    apiRaw.post<{ payoutId: string; netXAF: number }>(
      `/api/admin/finance/cashout-requests/${requestId}/approve`,
      {},
    ),
  rejectCashoutRequest: (requestId: string, reason: string) =>
    apiRaw.post<{ ok: true }>(`/api/admin/finance/cashout-requests/${requestId}/reject`, {
      reason,
    }),
};

export interface PilotMetrics {
  window: { from: string; to: string };
  reorderRate: { reorderers: number; uniqueCustomers: number; percent: number };
  completionRate: { delivered: number; total: number; percent: number };
  avgDeliveryTimeMs: number | null;
  avgVendorAcceptTimeMs: number | null;
}

export async function getPilotMetrics(params?: {
  from?: string;
  to?: string;
}): Promise<PilotMetrics> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiRaw.get<PilotMetrics>(`/api/admin/metrics${suffix}`);
}
