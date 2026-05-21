'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
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
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; balance: RiderBalanceView }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 30_000;

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
  const [state, setState] = React.useState<RiderBalanceState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const raw = await apiRaw.get('/api/riders/me/balance');
        if (cancelled) return;
        setState({ status: 'ready', balance: normalize(raw) });
        timer = setTimeout(fetchOnce, POLL_INTERVAL_MS);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        const message = err instanceof ApiClientError ? `Erreur ${err.status}` : 'Erreur réseau';
        setState({ status: 'error', message });
      }
    };

    setState({ status: 'loading' });
    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
