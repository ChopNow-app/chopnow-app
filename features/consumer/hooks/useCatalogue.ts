'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import type { CatalogueResponse } from '../types';

export type CatalogueState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; vendors: CatalogueResponse['vendors'] }
  | { status: 'error'; message: string };

/**
 * Fetches /api/catalogue for the given coords. Re-fires on lat/lng change
 * so flipping from the Douala fallback to a real GPS position refetches.
 *
 * `null` coords keep the hook in `idle` — call `useGeolocation().request()`
 * first to populate them.
 */
export function useCatalogue(
  coords: { lat: number; lng: number } | null,
  radiusKm = 10,
): CatalogueState {
  const query = useQuery({
    queryKey: [...queryKeys.catalogue(), coords?.lat, coords?.lng, radiusKm],
    queryFn: () => {
      const lat = coords!.lat;
      const lng = coords!.lng;
      return apiRaw.get(
        `/api/v1/catalogue?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
      ) as Promise<CatalogueResponse>;
    },
    enabled: !!coords,
    // Catalogue doesn't change often during a session — keep cached for 1 min
    // between refetches so back-nav from a vendor detail is instant.
    staleTime: 60_000,
  });

  if (!coords) return { status: 'idle' };
  if (query.isError) {
    const message =
      query.error instanceof ApiClientError
        ? `Erreur ${query.error.status} — réessaye dans un instant`
        : 'Erreur réseau';
    return { status: 'error', message };
  }
  if (query.data) return { status: 'ready', vendors: query.data.vendors };
  return { status: 'loading' };
}
