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

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  // Pre-order vendor cancel-after-accept (#187): order is awaiting refund
  // via Campay; Story 3.8 will flip it to REFUNDED once the refund settles.
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
  /**
   * Pre-orders (#187): the scheduled pickup/delivery window. ISO 8601. Null
   * for immediate orders. Shown prominently on the tracking page; locks the
   * cancel button (consumer cannot cancel a paid pre-order).
   */
  scheduledFor: string | null;
  acceptedAt: string | null;
  refusedAt: string | null;
  preparedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  refusalReason: string | null;
  // Set once dispatch assigns a rider (Story 4.1). Used by the consumer
  // UI to enable the "Appeler le livreur" button (Story 4.17 follow-up).
  riderId?: string | null;
  vendor: { id: string; name: string; userId?: string };
  items: OrderItem[];
  rating: { id: string; vendorScore: number; riderScore: number; comment: string | null } | null;
  // Story 4.13 — scoped by role. Consumer sees deliveryCode, vendor sees
  // pickupCode; backend omits the field the viewer shouldn't see.
  pickupCode?: string;
  deliveryCode?: string;
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
