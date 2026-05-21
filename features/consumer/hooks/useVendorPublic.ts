'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { PublicVendorView } from '../types';

export type VendorState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: PublicVendorView }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export function useVendorPublic(vendorId: string | null): VendorState {
  const query = useQuery({
    queryKey: queryKeys.publicVendor(vendorId ?? ''),
    queryFn: () => apiRaw.get(`/api/vendors/${vendorId}`) as Promise<PublicVendorView>,
    enabled: !!vendorId,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 404) return false;
      return count < 2;
    },
  });

  if (!vendorId) return { status: 'idle' };
  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 404) {
      return { status: 'not_found' };
    }
    const message =
      query.error instanceof ApiClientError ? `Erreur ${query.error.status}` : 'Erreur réseau';
    return { status: 'error', message };
  }
  if (query.data) return { status: 'ready', data: query.data };
  return { status: 'loading' };
}
