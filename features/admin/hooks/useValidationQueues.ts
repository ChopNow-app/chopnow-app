'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';

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
  // Restaurant KYC — null on INFORMAL + SEMI_FORMAL rows; admin reviews
  // them inline before approving the application.
  rccmNumber: string | null;
  niuNumber: string | null;
  enseignePhotoUrl: string | null;
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
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'ready'; rows: T[] }
  | { status: 'error'; message: string };

export type VendorQueueState = QueueState<PendingVendor>;
export type RiderQueueState = QueueState<PendingRider>;

function useQueue<T>(
  path: '/api/admin/vendors/pending' | '/api/admin/riders/pending',
): QueueState<T> & {
  reload: () => void;
} {
  const [state, setState] = React.useState<QueueState<T>>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET(path, {})
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (response.status === 403) {
          setState({ status: 'forbidden' });
          return;
        }
        if (error || !data) {
          setState({ status: 'error', message: `Erreur ${response.status}` });
          return;
        }
        setState({ status: 'ready', rows: data as unknown as T[] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [tick, path]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}

export const usePendingVendors = () => useQueue<PendingVendor>('/api/admin/vendors/pending');
export const usePendingRiders = () => useQueue<PendingRider>('/api/admin/riders/pending');
