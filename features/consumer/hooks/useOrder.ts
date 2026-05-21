'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

// Mirror the backend's Order shape — narrow to what the tracking page renders.
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

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';
export type PaymentMethod = 'MTN_MOMO' | 'ORANGE_MONEY';

export interface OrderItem {
  id: string;
  itemId: string | null;
  nameSnapshot: string;
  priceXAFSnapshot: number;
  quantity: number;
  lineXAF: number;
}

export interface OrderView {
  id: string;
  code: string;
  status: OrderStatus;
  subtotalXAF: number;
  deliveryFeeXAF: number;
  totalXAF: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  noteForVendor: string | null;
  deliveryQuartier: string;
  deliveryLandmark: string | null;
  deliveryDescription: string | null;
  deliveryPhone: string;
  placedAt: string;
  paidAt: string | null;
  scheduledFor: string | null;
  acceptedAt: string | null;
  refusedAt: string | null;
  preparedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refusalReason: string | null;
  riderId?: string | null;
  vendor: { id: string; name: string; userId?: string };
  items: OrderItem[];
  rating: { id: string; vendorScore: number; riderScore: number; comment: string | null } | null;
  pickupCode?: string;
  deliveryCode?: string;
}

export type OrderState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; order: OrderView }
  | { status: 'error'; message: string };

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REFUSED',
  'EXPIRED',
]);

const POLL_INTERVAL_MS = 10_000;

/**
 * Polls /api/orders/:id every 10s while the order is in a non-terminal
 * state. Stops polling once status hits DELIVERED / CANCELLED / REFUSED /
 * EXPIRED — the order lifecycle is slow enough (~30-60min end to end) that
 * a 10s cadence over HTTP is fine, and we avoid the WebSocket plumbing.
 */
export function useOrder(orderId: string | null): OrderState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => apiRaw.get(`/api/orders/${orderId}`) as Promise<OrderView>,
    enabled: !!orderId,
    refetchInterval: (q) => {
      const order = q.state.data as OrderView | undefined;
      if (order && TERMINAL_STATUSES.has(order.status)) return false;
      return POLL_INTERVAL_MS;
    },
    // 404 is part of the data domain (the link is stale, not a transient
    // server error), so a single fetch is enough — don't burn retries.
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
      return { status: 'error', message: `Erreur ${query.error.status}`, reload };
    }
    return { status: 'error', message: 'Erreur réseau', reload };
  }
  if (query.data) {
    return { status: 'ready', order: query.data, reload };
  }
  return { status: 'loading', reload };
}
