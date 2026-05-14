'use client';

// Same setState-in-effect carve-out as useCatalogue — fetch-on-mount pattern.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';
import type { PublicVendorView } from '../types';

export type VendorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: PublicVendorView }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export function useVendorPublic(vendorId: string | null): VendorState {
  const [state, setState] = React.useState<VendorState>({ status: 'idle' });

  React.useEffect(() => {
    if (!vendorId) return;
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET('/api/vendors/{vendorId}', { params: { path: { vendorId } } })
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (response.status === 404) {
          setState({ status: 'not_found' });
          return;
        }
        if (error || !data) {
          setState({
            status: 'error',
            message: `Erreur ${response.status}`,
          });
          return;
        }
        setState({ status: 'ready', data: data as unknown as PublicVendorView });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  return state;
}
