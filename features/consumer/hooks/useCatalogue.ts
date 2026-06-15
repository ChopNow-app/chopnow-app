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
 *
 * `q` is the free-text search query — passed through to the backend, which
 * matches vendor name/badge AND menu item names (e.g. "Ndolé" surfaces
 * vendors that serve it). Caller is responsible for debouncing `q` so
 * keystrokes don't each fire a request.
 */
export function useCatalogue(
  coords: { lat: number; lng: number } | null,
  radiusKm = 10,
  q = '',
): CatalogueState {
  const query = useQuery({
    queryKey: [...queryKeys.catalogue(), coords?.lat, coords?.lng, radiusKm, q],
    queryFn: () => {
      const lat = coords!.lat;
      const lng = coords!.lng;
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radiusKm: String(radiusKm),
      });
      if (q.trim()) params.set('q', q.trim());
      return apiRaw.get(`/api/v1/catalogue?${params.toString()}`) as Promise<CatalogueResponse>;
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
