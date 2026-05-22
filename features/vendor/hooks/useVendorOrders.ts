'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'ACCEPTED'
  | 'IN_PREP'
  | 'READY_PICKUP'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUSED'
  | 'EXPIRED';

export interface VendorOrder {
  id: string;
  code: string;
  status: OrderStatus;
  subtotalXAF: number;
  deliveryFeeXAF: number;
  totalXAF: number;
  noteForVendor: string | null;
  paymentMethod: 'MTN_MOMO' | 'ORANGE_MONEY';
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
  deliveryQuartier: string;
  deliveryLandmark: string | null;
  placedAt: string;
  acceptedAt: string | null;
  preparedAt: string | null;
  acceptanceDeadlineAt: string | null;
  scheduledFor: string | null;
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    lineXAF: number;
    preparedAt: string | null;
  }>;
  pickupCode?: string;
  riderId?: string | null;
}

export type OrdersState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; orders: VendorOrder[] }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 10_000;

/**
 * Story 3.7 + #187 pre-orders — polls GET /orders/vendor/me every 10s.
 * Mutation handlers (accept, refuse, ready) invalidate `queryKeys.vendor.orders()`
 * so cards update instantly instead of waiting for the next interval.
 *
 * `type=immediate` (default) returns today's flow (scheduledFor=null).
 * `type=preorder` returns paid pre-orders sorted by scheduledFor ASC.
 *
 * When `enabled=false`, returns an immediate empty `ready` so the caller
 * can render "0 items" without a loading flicker.
 */
export function useVendorOrders(
  type: 'immediate' | 'preorder' = 'immediate',
  enabled = true,
): OrdersState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.vendor.orders(type),
    queryFn: () => apiRaw.get(`/api/v1/orders/vendor/me?type=${type}`) as Promise<VendorOrder[]>,
    enabled,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const reload = () => {
    void query.refetch();
  };

  if (!enabled) {
    return { status: 'ready', orders: [], reload };
  }
  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', reload };
    }
    const message =
      query.error instanceof ApiClientError ? `Erreur ${query.error.status}` : 'Erreur réseau';
    return { status: 'error', message, reload };
  }
  if (query.data) {
    return { status: 'ready', orders: query.data, reload };
  }
  return { status: 'loading', reload };
}
