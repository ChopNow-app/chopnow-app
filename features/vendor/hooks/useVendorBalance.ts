'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import type { components } from '@/lib/api/types';

// Generated from the OpenAPI spec via `npm run codegen:api`. The nullable
// date fields come back as `Record<string, never> | null` because of how
// openapi-typescript models nullable date-time strings — we narrow them
// here for the rest of the codebase.
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

export type VendorBalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; balance: VendorBalanceView }
  | { status: 'error'; message: string };

/**
 * Story 7.2 — vendor "Mon solde" card. Polls /vendors/me/balance every
 * 30s while the dashboard is visible. We don't poll more aggressively
 * because the balance only changes on order delivery (vendor cron sees
 * deliveries through orderShare updates) — 30s is well within the
 * "feels live" budget without burning the API.
 */
const POLL_INTERVAL_MS = 30_000;

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

export function useVendorBalance(): VendorBalanceState & { reload: () => void } {
  const [state, setState] = React.useState<VendorBalanceState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const raw = await apiRaw.get('/api/vendors/me/balance');
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
