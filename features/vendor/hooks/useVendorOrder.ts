'use client';

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import type { VendorOrder } from './useVendorOrders';

export type VendorOrderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; order: VendorOrder }
  | { status: 'error'; message: string };

/**
 * Fetch a single order owned by the current vendor.
 *
 * Polls every 5s on a fixed setInterval — the screen is the vendor's
 * primary decision surface, and we want auto-refusals from the backend
 * cron to surface within a couple seconds rather than wait on the next
 * navigation.
 */
const POLL_INTERVAL_MS = 5_000;

export function useVendorOrder(orderId: string): VendorOrderState & { reload: () => void } {
  const [state, setState] = React.useState<VendorOrderState>({ status: 'loading' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const order = await apiRaw.get<VendorOrder>(`/api/orders/${orderId}`);
        if (cancelled) return;
        setState({ status: 'ready', order });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          if (err.status === 401) return setState({ status: 'unauthenticated' });
          if (err.status === 404) return setState({ status: 'not_found' });
          const body = err.body as { message?: string } | undefined;
          return setState({
            status: 'error',
            message: body?.message ?? `Erreur ${err.status}`,
          });
        }
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      }
    };

    void fetchOnce();
    const id = window.setInterval(() => {
      void fetchOnce();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [orderId, tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
