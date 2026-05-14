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

export interface RiderCourse {
  id: string;
  code: string;
  status: OrderStatus;
  subtotalXAF: number;
  deliveryFeeXAF: number;
  totalXAF: number;
  noteForVendor: string | null;
  deliveryQuartier: string;
  deliveryLandmark: string | null;
  deliveryDescription: string | null;
  deliveryPhone: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  vendor: { id: string; name: string; quartier: string };
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    lineXAF: number;
  }>;
}

export type CoursesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; courses: RiderCourse[] }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 10_000;

export function useRiderCourses(): CoursesState & { reload: () => void } {
  const [state, setState] = React.useState<CoursesState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const { data, error, response } = await api.GET('/api/riders/me/courses', {});
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (error || !data) {
          setState({ status: 'error', message: `Erreur ${response.status}` });
          return;
        }
        setState({ status: 'ready', courses: data as unknown as RiderCourse[] });
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
