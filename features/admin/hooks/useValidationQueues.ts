'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

export interface PendingVendor {
  id: string;
  name: string;
  type: 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
  quartier: string;
  pointOfReference: string | null;
  whatsappPhone: string;
  declaredCapacity: number | null;
  profilePhotoUrl: string | null;
  submittedAt: string;
  rccmNumber: string | null;
  niuNumber: string | null;
  enseignePhotoUrl: string | null;
  acceptsPreOrders: boolean;
}

export interface PendingRider {
  id: string;
  vehicleType: 'ON_FOOT' | 'BICYCLE' | 'MOTO' | 'CAR';
  preferredZone: string | null;
  licensePlate: string | null;
  momoPhone: string;
  idCardPhotoUrl: string | null;
  selfiePhotoUrl: string | null;
  vehiclePhotoUrl: string | null;
  submittedAt: string;
  user: { id: string; displayName: string | null; phone: string };
}

type QueueState<T> =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'ready'; rows: T[] }
  | { status: 'error'; message: string };

export type VendorQueueState = QueueState<PendingVendor>;
export type RiderQueueState = QueueState<PendingRider>;

function useQueue<T>(
  path: '/api/admin/vendors/pending' | '/api/admin/riders/pending',
  scope: 'vendors' | 'riders',
): QueueState<T> & { reload: () => void } {
  const query = useQuery({
    queryKey: [...queryKeys.admin.validationQueues(), scope],
    queryFn: () => apiRaw.get(path) as Promise<T[]>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
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
      if (query.error.status === 403) return { status: 'forbidden', reload };
      return { status: 'error', message: `Erreur ${query.error.status}`, reload };
    }
    return { status: 'error', message: 'Erreur réseau', reload };
  }
  if (query.data) return { status: 'ready', rows: query.data, reload };
  return { status: 'loading', reload };
}

export const usePendingVendors = () =>
  useQueue<PendingVendor>('/api/admin/vendors/pending', 'vendors');
export const usePendingRiders = () => useQueue<PendingRider>('/api/admin/riders/pending', 'riders');
