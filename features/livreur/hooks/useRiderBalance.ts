'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { components } from '@/lib/api/types';

type ApiRiderBalance = components['schemas']['RiderSelfBalanceDto'];
type ApiPayoutSummary = components['schemas']['PayoutSummaryDto'];

export interface RiderBalanceView {
  balanceXAF: number;
  lastPayoutAt: string | null;
  lastPayoutXAF: number | null;
  nextScheduledPayout: {
    cadence: 'DAILY_MORNING';
    estimatedAt: string | null;
  };
  recentPayouts: PayoutSummary[];
}

export interface PayoutSummary {
  id: string;
  periodStart: string;
  periodEnd: string;
  netXAF: number;
  status: ApiPayoutSummary['status'];
  paidAt: string | null;
}

export type RiderBalanceState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; balance: RiderBalanceView }
  | { status: 'error'; message: string };

function normalize(raw: ApiRiderBalance): RiderBalanceView {
  return {
    balanceXAF: raw.balanceXAF,
    lastPayoutAt: (raw.lastPayoutAt as unknown as string | null) ?? null,
    lastPayoutXAF: (raw.lastPayoutXAF as unknown as number | null) ?? null,
    nextScheduledPayout: {
      cadence: 'DAILY_MORNING',
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
  };
}

export function useRiderBalance(): RiderBalanceState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.rider.balance(),
    queryFn: () => apiRaw.get('/api/riders/me/balance') as Promise<ApiRiderBalance>,
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
