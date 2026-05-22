'use client';

import * as React from 'react';

export type GeolocationState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'ready'; lat: number; lng: number; accuracyMeters: number }
  | { status: 'denied'; message: string }
  | { status: 'unsupported' };

// Douala city center — used by the /restaurants page as the consumer
// fallback when geolocation is unavailable / denied. The catalogue still
// renders something useful so the user can pick a vendor while figuring
// out their permissions.
export const DOUALA_FALLBACK = { lat: 4.0511, lng: 9.7679 };

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
