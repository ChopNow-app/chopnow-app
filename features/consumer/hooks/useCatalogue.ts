'use client';

// React 19's `react-hooks/set-state-in-effect` rule bites the standard
// "fetch-on-mount + setState transitions" pattern this hook implements.
// Disabling at the file level — when we move the catalogue to swr / react-
// query post-MVP, this hook goes away entirely.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';
import type { CatalogueResponse } from '../types';

export type CatalogueState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; vendors: CatalogueResponse['vendors'] }
  | { status: 'error'; message: string };

/**
 * Fetches /api/catalogue once for the given coords. Re-fires on
 * lat/lng change so flipping from the Douala fallback to a real GPS
 * position refetches the list.
 *
 * `null` coords keep the hook in `idle` — call `useGeolocation().request()`
 * first to populate them.
 */
export function useCatalogue(
  coords: { lat: number; lng: number } | null,
  radiusKm = 10,
): CatalogueState {
  const [state, setState] = React.useState<CatalogueState>({ status: 'idle' });

  React.useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET('/api/catalogue', { params: { query: { lat: coords.lat, lng: coords.lng, radiusKm } } })
      .then(({ data, error, response }) => {
        if (cancelled) return;
        if (error || !data) {
          setState({
            status: 'error',
            message: `Erreur ${response.status} — réessaye dans un instant`,
          });
          return;
        }
        // openapi-fetch returns `data` typed as `unknown` since our backend
        // doesn't emit response schemas yet; cast to the local view shape.
        const vendors = (data as unknown as CatalogueResponse).vendors;
        setState({ status: 'ready', vendors });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [coords, radiusKm]);

  return state;
}
