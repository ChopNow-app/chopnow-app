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
  paymentStatus: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
  deliveryQuartier: string;
  deliveryLandmark: string | null;
  placedAt: string;
  acceptedAt: string | null;
  preparedAt: string | null;
  // Vendor SLA — present on PENDING/CONFIRMED rows; null after the auto-refuse
  // cron flips status. The countdown screen uses this absolute deadline so
  // remaining time survives tab reloads.
  acceptanceDeadlineAt: string | null;
  // Pre-orders (#187): null for immediate flow (today's behaviour). Set =
  // scheduled pickup/delivery time. The "Pré-commandes" dashboard tab fetches
  // these via ?type=preorder; cards show relative time ("dans 4h"); vendor
  // cancel-after-accept on /vendor/preparation/[id] triggers the penalty.
  scheduledFor: string | null;
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
  // Story 4.17 — set once dispatch assigns a rider. Used by the vendor
  // UI to enable the "Appeler le livreur" button.
  riderId?: string | null;
}

export type OrdersState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; orders: VendorOrder[] }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 10_000;

/**
 * Story 3.7 + #187 pre-orders — polls GET /orders/vendor/me every 10s.
 * `type=immediate` (default) returns today's flow (scheduledFor=null).
 * `type=preorder` returns paid pre-orders sorted by scheduledFor ASC for the
 * vendor's "Pré-commandes" tab.
 */
export function useVendorOrders(
  type: 'immediate' | 'preorder' = 'immediate',
  enabled = true,
): OrdersState & { reload: () => void } {
  const [state, setState] = React.useState<OrdersState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    if (!enabled) {
      // When the caller doesn't want to fetch (e.g. a vendor who hasn't
      // opted into pre-orders), return an empty ready state so the caller
      // can render "0 items" without an error / loading flicker.
      setState({ status: 'ready', orders: [] });
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const { data, error, response } = await api.GET('/api/orders/vendor/me', {
          params: { query: { type } },
        });
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
  }, [tick, type, enabled]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
