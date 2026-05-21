'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { VendorOrder } from './useVendorOrders';

export type VendorOrderState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; order: VendorOrder }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 5_000;

/**
 * Fetch a single order owned by the current vendor. Polls every 5s —
 * the screen is the vendor's primary decision surface, so we want
 * auto-refusals + rider pickups from the backend to surface quickly.
 *
 * Mutations on /vendor/preparation/[id] (accept, refuse, mark prepared,
 * mark ready) invalidate `queryKeys.vendor.order(orderId)` for an
 * immediate refresh.
 */
export function useVendorOrder(orderId: string): VendorOrderState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.vendor.order(orderId),
    queryFn: () => apiRaw.get(`/api/orders/${orderId}`) as Promise<VendorOrder>,
    refetchInterval: POLL_INTERVAL_MS,
    retry: (count, err) => {
      if (err instanceof ApiClientError && (err.status === 404 || err.status === 401)) {
        return false;
      }
      return count < 2;
    },
  });

  const reload = () => {
    void query.refetch();
  };

  if (query.isError) {
    if (query.error instanceof ApiClientError) {
      if (query.error.status === 401) return { status: 'unauthenticated', reload };
      if (query.error.status === 404) return { status: 'not_found', reload };
      const body = query.error.body as { message?: string } | undefined;
      return {
        status: 'error',
        message: body?.message ?? `Erreur ${query.error.status}`,
        reload,
      };
    }
    return { status: 'error', message: 'Erreur réseau', reload };
  }
  if (query.data) {
    return { status: 'ready', order: query.data, reload };
  }
  return { status: 'loading', reload };
}
