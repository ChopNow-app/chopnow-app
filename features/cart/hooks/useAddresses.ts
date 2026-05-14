'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';

export interface SavedAddress {
  id: string;
  label: string | null;
  description: string | null;
  quartier: string | null;
  landmarkId: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  isDefault: boolean;
}

export type AddressesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; addresses: SavedAddress[] }
  | { status: 'error'; message: string };

export function useAddresses(): AddressesState & { reload: () => void } {
  const [state, setState] = React.useState<AddressesState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET('/api/users/me/addresses', {})
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (response.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (error || !data) {
          setState({ status: 'error', message: `Erreur ${response.status}` });
          return;
        }
        setState({ status: 'ready', addresses: data as unknown as SavedAddress[] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
