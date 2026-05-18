'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';

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
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveryQuartier: string;
  deliveryLandmark: string | null;
  placedAt: string;
  acceptedAt: string | null;
  preparedAt: string | null;
  // Vendor SLA — present on PENDING/CONFIRMED rows; null after the auto-refuse
  // cron flips status. The countdown screen uses this absolute deadline so
  // remaining time survives tab reloads.
  acceptanceDeadlineAt: string | null;
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    lineXAF: number;
    // Preparation checkbox — set by the vendor on /vendor/preparation/[orderId].
    // Null = unprepared, ISO timestamp = prepared. The full-checklist "all
    // prepared" precondition unlocks the "Commande prête" CTA.
    preparedAt: string | null;
  }>;
  // Story 4.13 — vendor's 4-digit pickup code shown to the rider at pickup.
  // Backend strips the consumer's deliveryCode from this list response.
  pickupCode?: string;
}

export type OrdersState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; orders: VendorOrder[] }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 10_000;

/**
 * Story 3.7 — polls GET /orders/vendor/me every 10s. Vendor sees PENDING /
 * CONFIRMED (awaiting their decision) + ACCEPTED / IN_PREP / READY_PICKUP /
 * PICKED_UP (active courses) in one feed; the dashboard splits them client-
 * side.
 */
export function useVendorOrders(): OrdersState & { reload: () => void } {
  const [state, setState] = React.useState<OrdersState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const { data, error, response } = await api.GET('/api/orders/vendor/me', {});
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (error || !data) {
          setState({ status: 'error', message: `Erreur ${response.status}` });
          return;
        }
        setState({ status: 'ready', orders: data as unknown as VendorOrder[] });
        timer = setTimeout(fetchOnce, POLL_INTERVAL_MS);
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
  }, [tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
