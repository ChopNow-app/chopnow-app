'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

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
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; addresses: SavedAddress[] }
  | { status: 'error'; message: string };

export function useAddresses(): AddressesState & { reload: () => void } {
  const query = useQuery({
    queryKey: queryKeys.user.addresses(),
    queryFn: () => apiRaw.get('/api/v1/users/me/addresses') as Promise<SavedAddress[]>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
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
  if (query.data) return { status: 'ready', addresses: query.data, reload };
  return { status: 'loading', reload };
}
