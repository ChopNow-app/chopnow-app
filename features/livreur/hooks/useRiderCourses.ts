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
  deliveryLat: number;
  deliveryLng: number;
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
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; courses: RiderCourse[] }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 10_000;

export function useRiderCourses(): CoursesState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.rider.courses(),
    queryFn: () => apiRaw.get('/api/riders/me/courses') as Promise<RiderCourse[]>,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const reload = () => {
    void query.refetch();
  };

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', reload };
    }
    const message =
      query.error instanceof ApiClientError ? `Erreur ${query.error.status}` : 'Erreur réseau';
    return { status: 'error', message, reload };
  }
  if (query.data) {
    return { status: 'ready', courses: query.data, reload };
  }
  return { status: 'loading', reload };
}
