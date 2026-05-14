'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';

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

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH';

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
  acceptedAt: string | null;
  refusedAt: string | null;
  preparedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refusalReason: string | null;
  vendor: { id: string; name: string; userId?: string };
  items: OrderItem[];
}

export type OrderState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; order: OrderView }
  | { status: 'error'; message: string };

/**
 * Polls /api/orders/:id every 10s while the order is in a non-terminal
 * state. Stops polling on DELIVERED / CANCELLED / REFUSED / EXPIRED.
 *
 * We poll instead of WebSocket for MVP — the order lifecycle is slow
 * enough (~30-60min end to end) that a 10s cadence over HTTP is fine,
 * and avoids the WebSocket plumbing.
 */
const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'DELIVERED',
  'CANCELLED',
  'REFUSED',
  'EXPIRED',
]);

const POLL_INTERVAL_MS = 10_000;

export function useOrder(orderId: string | null): OrderState & { reload: () => void } {
  const [state, setState] = React.useState<OrderState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const { data, error, response } = await api.GET('/api/orders/{orderId}', {
          params: { path: { orderId } },
        });
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (response.status === 404) {
          setState({ status: 'not_found' });
          return;
        }
        if (error || !data) {
          setState({ status: 'error', message: `Erreur ${response.status}` });
          return;
        }
        const order = data as unknown as OrderView;
        setState({ status: 'ready', order });
        if (!TERMINAL_STATUSES.has(order.status)) {
          timer = setTimeout(fetchOnce, POLL_INTERVAL_MS);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      }
    };

    setState({ status: 'loading' });
    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
