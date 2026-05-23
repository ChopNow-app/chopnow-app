'use client';

import * as React from 'react';

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'ready'; lat: number; lng: number; accuracyMeters: number }
  | { status: 'denied'; message: string }
  | { status: 'unsupported' };

// Douala city center — used by the /restaurants page as the consumer
// fallback when geolocation is unavailable / denied / OR returns a
// location outside the service area. The catalogue still renders
// something useful so the user can pick a vendor while figuring out
// their permissions or while travelling outside Cameroon.
export const DOUALA_FALLBACK = { lat: 4.0511, lng: 9.7679 };

/**
 * Generous bounding box around Douala (capital region of Cameroon's
 * Littoral). Anyone outside this box is presumed to be outside the pilot
 * service area, so we treat their coords as "unhelpful for catalogue
 * filtering" and silently swap to DOUALA_FALLBACK rather than show an
 * empty catalogue.
 *
 * Boundaries (~1.5° each side of Douala center 4.05N, 9.77E):
 *   south 2.5°N · north 5.5°N · west 8.5°E · east 11.0°E
 *
 * Covers Douala + Yaoundé + the Littoral / Centre regions of Cameroon
 * with margin for GPS drift. Tighten when expanding to other countries.
 */
export const SERVICE_AREA_BBOX = {
  minLat: 2.5,
  maxLat: 5.5,
  minLng: 8.5,
  maxLng: 11.0,
} as const;

export function isInServiceArea(lat: number, lng: number): boolean {
  return (
    lat >= SERVICE_AREA_BBOX.minLat &&
    lat <= SERVICE_AREA_BBOX.maxLat &&
    lng >= SERVICE_AREA_BBOX.minLng &&
    lng <= SERVICE_AREA_BBOX.maxLng
  );
}

/**
 * Effective catalogue search coords given a geolocation state.
 *   - 'ready' inside service area → real GPS coords (`source: 'gps'`)
 *   - 'ready' outside service area → DOUALA_FALLBACK (`source: 'out-of-zone'`)
 *   - 'denied' / 'unsupported'    → DOUALA_FALLBACK (`source: 'unavailable'`)
 *   - 'idle' / 'requesting'        → null coords (caller suspends fetch)
 */
export function resolveCoords(
  state: GeolocationState,
):
  | { coords: { lat: number; lng: number }; source: 'gps' | 'out-of-zone' | 'unavailable' }
  | { coords: null; source: 'pending' } {
  if (state.status === 'ready') {
    if (isInServiceArea(state.lat, state.lng)) {
      return { coords: { lat: state.lat, lng: state.lng }, source: 'gps' };
    }
    return { coords: DOUALA_FALLBACK, source: 'out-of-zone' };
  }
  if (state.status === 'denied' || state.status === 'unsupported') {
    return { coords: DOUALA_FALLBACK, source: 'unavailable' };
  }
  return { coords: null, source: 'pending' };
}

/**
 * Single-shot geolocation hook. `request()` triggers the browser prompt;
 * subsequent re-renders surface the resolved/denied state. Doesn't
 * subscribe to `watchPosition` — for the catalogue page the consumer's
 * position rarely changes between page views, and continuous updates
 * would drain the battery on Tecno/Itel mid-range.
 */
export function useGeolocation(): GeolocationState & {
  request: () => void;
} {
  const [state, setState] = React.useState<GeolocationState>({ status: 'idle' });

  const request = React.useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'ready',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Permission de localisation refusée'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Position GPS indisponible'
              : err.code === err.TIMEOUT
                ? 'Délai dépassé — réessaye'
                : 'Erreur de localisation';
        setState({ status: 'denied', message });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return React.useMemo(() => ({ ...state, request }), [state, request]);
}
