'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { components } from '@/lib/api/types';

type ApiVendorBalance = components['schemas']['VendorSelfBalanceDto'];
type ApiPayoutSummary = components['schemas']['PayoutSummaryDto'];

export type VendorPayoutCadence = 'WEEKLY_SUNDAY' | 'ON_DEMAND';

export interface VendorBalanceView {
  balanceXAF: number;
  isTrusted: boolean;
  vendorType: ApiVendorBalance['vendorType'];
  lastPayoutAt: string | null;
  lastPayoutXAF: number | null;
  nextScheduledPayout: {
    cadence: VendorPayoutCadence;
    estimatedAt: string | null;
  };
  recentPayouts: PayoutSummary[];
  pendingCashoutRequestId: string | null;
}

export interface PayoutSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  netXAF: number;
  status: ApiPayoutSummary['status'];
  paidAt: string | null;
}

// Discriminated union preserved for callers that switch on `status`. Mapped
// from useQuery's lifecycle: query.isError → 'error'; query.data → 'ready';
// otherwise → 'loading'. 'unauthenticated' is a special case where the
// fetch threw ApiClientError(401) — auth middleware tried to refresh and
// gave up.
export type VendorBalanceState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; balance: VendorBalanceView }
  | { status: 'error'; message: string };

function normalize(raw: ApiVendorBalance): VendorBalanceView {
  return {
    balanceXAF: raw.balanceXAF,
    isTrusted: raw.isTrusted,
    vendorType: raw.vendorType,
    lastPayoutAt: (raw.lastPayoutAt as unknown as string | null) ?? null,
    lastPayoutXAF: (raw.lastPayoutXAF as unknown as number | null) ?? null,
    nextScheduledPayout: {
      cadence: raw.nextScheduledPayout.cadence as VendorPayoutCadence,
      estimatedAt: (raw.nextScheduledPayout.estimatedAt as unknown as string | null) ?? null,
    },
    recentPayouts: raw.recentPayouts.map((p) => ({
      id: p.id,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      netXAF: p.netXAF,
      status: p.status,
      paidAt: (p.paidAt as unknown as string | null) ?? null,
    })),
    pendingCashoutRequestId: (raw.pendingCashoutRequestId as unknown as string | null) ?? null,
  };
}

/**
 * Story 7.2 — vendor "Mon solde" card. Refetches every 30s + on window
 * focus + on reconnect. Cache invalidated by `useVendorCashout` after a
 * successful request so the balance updates immediately instead of
 * waiting up to 30s for the next poll.
 */
export function useVendorBalance(): VendorBalanceState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.vendor.balance(),
    queryFn: () => apiRaw.get('/api/v1/vendors/me/balance') as Promise<ApiVendorBalance>,
    refetchInterval: 30_000,
    select: normalize,
  });

  const reload = () => {
    void query.refetch();
  };

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', reload };
    }
    const message =
      query.error instanceof ApiClientError ? `Erreur ${query.error.status}` : 'Erreur réseau';
    return { status: 'error', message, reload };
  }
  if (query.data) {
    return { status: 'ready', balance: query.data, reload };
  }
  return { status: 'loading', reload };
}
