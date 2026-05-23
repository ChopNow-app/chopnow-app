import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { accessTokenStore } from '@/lib/auth/access-token-store';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AdminLoginResult {
  accessToken: string;
  role: AdminRole;
  email: string;
  expiresIn: number;
}

/**
 * Phase D1 — admin auth now mirrors consumer:
 *   - access token (15-min) → in-memory `accessTokenStore`
 *   - refresh token (24h)   → HttpOnly `chopnow_rt` cookie (server-set)
 *   - device id             → HttpOnly `chopnow_did` cookie (server-set)
 *
 * The legacy `chopnow.admin.token` localStorage entry is gone — XSS on
 * /admin/* can no longer steal a long-lived bearer. Role + email stay
 * in localStorage as non-secret UX hints (header label, redirect routing).
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResult> {
  try {
    const result = await apiRaw.post<AdminLoginResult>('/api/v1/admin/auth/login', {
      email,
      password,
    });
    accessTokenStore.set(result.accessToken);
    if (typeof window !== 'undefined') {
      // Belt-and-braces: wipe any pre-Phase-D1 admin tokens (and any
      // pre-Phase-B1 consumer tokens) sitting in localStorage from
      // before this PR shipped. XSS can read these otherwise.
      window.localStorage.removeItem('chopnow.admin.token');
      window.localStorage.removeItem('chopnow.access');
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
/**
 * Phase D1 — admin logout now hits the server (revokes the refresh
 * cookie row) like consumer's `auth.logout()`, then clears the
 * admin-only localStorage hints. Pre-D1 this was a local-wipe-only
 * because admin had no refresh side; now it actually invalidates the
 * server session.
 */
export async function adminLogout() {
  await auth.logout();
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('chopnow.admin.token');
  window.localStorage.removeItem('chopnow.admin.role');
  window.localStorage.removeItem('chopnow.admin.email');
}

/** Decision payload — `reason` required for reject/suspend, optional otherwise. */
export interface DecisionPayload {
  reason?: string;
}

export const adminApi = {
  approveVendor: (id: string) => apiRaw.post(`/api/v1/admin/vendors/${id}/approve`, {}),
  rejectVendor: (id: string, reason: string) =>
    apiRaw.post(`/api/v1/admin/vendors/${id}/reject`, { reason }),
  suspendVendor: (id: string, reason: string) =>
    apiRaw.post(`/api/v1/admin/vendors/${id}/suspend`, { reason }),
  unsuspendVendor: (id: string) => apiRaw.post(`/api/v1/admin/vendors/${id}/unsuspend`, {}),
  // #187 follow-up — toggle the vendor's pre-order opt-in. Idempotent
  // server-side, so retries / double-taps don't surprise.
  setVendorPreOrders: (id: string, acceptsPreOrders: boolean) =>
    apiRaw.patch(`/api/v1/admin/vendors/${id}/pre-orders`, { acceptsPreOrders }),

  approveRider: (id: string) => apiRaw.post(`/api/v1/admin/riders/${id}/approve`, {}),
  rejectRider: (id: string, reason: string) =>
    apiRaw.post(`/api/v1/admin/riders/${id}/reject`, { reason }),
  suspendRider: (id: string, reason: string) =>
    apiRaw.post(`/api/v1/admin/riders/${id}/suspend`, { reason }),
  unsuspendRider: (id: string) => apiRaw.post(`/api/v1/admin/riders/${id}/unsuspend`, {}),
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
    return apiRaw.get<PagedResult<VendorBalanceRow>>(
      `/api/v1/admin/finance/vendor-balances${suffix}`,
    );
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
    return apiRaw.get<PagedResult<RiderBalanceRow>>(
      `/api/v1/admin/finance/rider-balances${suffix}`,
    );
  },
  listRefundQueue: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRaw.get<PagedResult<RefundQueueRow>>(`/api/v1/admin/finance/refund-queue${suffix}`);
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
      `/api/v1/admin/finance/cashout-requests${suffix}`,
    );
  },
  approveCashoutRequest: (requestId: string) =>
    apiRaw.post<{ payoutId: string; netXAF: number }>(
      `/api/v1/admin/finance/cashout-requests/${requestId}/approve`,
      {},
    ),
  rejectCashoutRequest: (requestId: string, reason: string) =>
    apiRaw.post<{ ok: true }>(`/api/v1/admin/finance/cashout-requests/${requestId}/reject`, {
      reason,
    }),

  // ── Escalations (ADR-0005 §S3 / #85) ─────────────────────────────

  listEscalations: () => apiRaw.get<EscalationItem[]>('/api/v1/admin/finance/escalations'),
  retryVendorPayout: (payoutId: string) =>
    apiRaw.post<{ status: 'PENDING' }>(
      `/api/v1/admin/finance/vendor-payouts/${payoutId}/retry`,
      {},
    ),
  retryRiderPayout: (payoutId: string) =>
    apiRaw.post<{ status: 'PENDING' }>(`/api/v1/admin/finance/rider-payouts/${payoutId}/retry`, {}),
  manualMarkVendorPayoutPaid: (payoutId: string, body: { campayRef: string; note?: string }) =>
    apiRaw.post<{ status: 'PAID' }>(
      `/api/v1/admin/finance/vendor-payouts/${payoutId}/manual-mark-paid`,
      body,
    ),
  manualMarkRiderPayoutPaid: (payoutId: string, body: { campayRef: string; note?: string }) =>
    apiRaw.post<{ status: 'PAID' }>(
      `/api/v1/admin/finance/rider-payouts/${payoutId}/manual-mark-paid`,
      body,
    ),
};

export interface EscalationItem {
  kind: 'vendor_payout' | 'rider_payout' | 'refund';
  id: string;
  contextId: string;
  status: 'PENDING' | 'IN_FLIGHT' | 'PAID' | 'FAILED' | 'CANCELLED' | 'STALE_REFUND';
  netXAF: number;
  momoPhone: string | null;
  failureReason: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  ageMinutes: number;
}

export interface StuckPickupItem {
  orderId: string;
  code: string;
  vendorId: string;
  vendorName: string;
  riderId: string | null;
  riderName: string | null;
  userId: string;
  totalXAF: number;
  pickedUpAt: string | null;
  minutesStuck: number;
}

export interface ResolveRiderFraudBody {
  riderAction: 'SUSPEND' | 'WARN';
  vendorCompensation: boolean;
  consumerRefund: boolean;
  note: string;
}

export interface ResolveRiderFraudResult {
  orderStatus: string;
  consumerRefundQueued: boolean;
  vendorCompensationXAF: number;
  riderSuspended: boolean;
}

export interface CampayCircuitState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  consecutiveFailures: number;
  openedAt: number;
}

export const adminRiderFraudApi = {
  listStuckPickups: () => apiRaw.get<StuckPickupItem[]>('/api/v1/admin/orders/stuck-pickup'),
  resolve: (orderId: string, body: ResolveRiderFraudBody) =>
    apiRaw.post<ResolveRiderFraudResult>(
      `/api/v1/admin/orders/${orderId}/resolve-rider-fraud`,
      body,
    ),
};

export const adminCampayApi = {
  getCircuitState: () => apiRaw.get<CampayCircuitState>('/api/v1/admin/finance/campay-circuit'),
};

export interface DispatchFunnel {
  ordersAssigned: number;
  assignedOnFirstAttempt: number;
  expiredNoRider: number;
  avgAttemptsToAssign: number | null;
  topRiders: Array<{ riderId: string; offers: number }>;
}

export interface PilotMetrics {
  window: { from: string; to: string };
  reorderRate: { reorderers: number; uniqueCustomers: number; percent: number };
  completionRate: { delivered: number; total: number; percent: number };
  avgDeliveryTimeMs: number | null;
  avgVendorAcceptTimeMs: number | null;
  dispatchFunnel: DispatchFunnel;
}

export async function getPilotMetrics(params?: {
  from?: string;
  to?: string;
}): Promise<PilotMetrics> {
  const qs = new URLSearchParams();
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiRaw.get<PilotMetrics>(`/api/v1/admin/metrics${suffix}`);
}
