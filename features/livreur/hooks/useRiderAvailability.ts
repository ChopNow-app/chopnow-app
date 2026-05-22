'use client';

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

const STORAGE_KEY = 'chopnow.rider.isOnline';

/**
 * Single source of truth for the rider's `isOnline` flag on the client.
 * Cache locally so toggling the screen back on doesn't briefly show
 * the rider as offline before the server roundtrip completes.
 *
 * Backend POST /riders/me/availability is the authoritative writer —
 * we mirror its acknowledged response.
 */
export type AvailabilityState =
  | { isOnline: boolean; setting: false; error: string | null }
  | { isOnline: boolean; setting: true; error: null };

export function useRiderAvailability(): AvailabilityState & {
  setOnline(next: boolean): Promise<void>;
} {
  const initial = (() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  })();
  const [state, setState] = React.useState<AvailabilityState>({
    isOnline: initial,
    setting: false,
    error: null,
  });

  const setOnline = React.useCallback(async (next: boolean) => {
    setState((prev) => ({ isOnline: prev.isOnline, setting: true, error: null }));
    try {
      await apiRaw.patch('/api/v1/riders/me/availability', { isOnline: next });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      }
      setState({ isOnline: next, setting: false, error: null });
    } catch (err) {
      let message = 'Impossible de changer ton statut';
      if (err instanceof ApiClientError) {
        const body = err.body as { code?: string; message?: string } | undefined;
        if (body?.code === 'rider_not_active') {
          message = "Ton dossier doit d'abord être validé par un admin.";
        } else if (body?.message) {
          message = body.message;
        }
      }
      setState((prev) => ({ isOnline: prev.isOnline, setting: false, error: message }));
    }
  }, []);

  return React.useMemo(() => ({ ...state, setOnline }), [state, setOnline]);
}
