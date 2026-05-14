'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

export interface AvailabilityView {
  isOpen: boolean;
  isOpenNow: boolean;
  hours: Record<string, { open: string; close: string }> | null;
}

export type AvailabilityState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; data: AvailabilityView; saving: boolean; error: string | null }
  | { status: 'error'; message: string };

/**
 * Story 2.4 — single-source-of-truth for vendor availability + hours on the
 * dashboard. GET /vendors/me/availability on mount, PATCH same path to flip
 * the toggle.
 */
export function useVendorAvailability(): AvailabilityState & {
  setOpen(next: boolean): Promise<void>;
  reload(): void;
} {
  const [state, setState] = React.useState<AvailabilityState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET('/api/vendors/me/availability', {})
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
        setState({
          status: 'ready',
          data: data as unknown as AvailabilityView,
          saving: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const setOpen = React.useCallback(
    async (next: boolean) => {
      setState((prev) => {
        if (prev.status !== 'ready') return prev;
        return { ...prev, saving: true, error: null };
      });
      try {
        await apiRaw.patch('/api/vendors/me/availability', { isOpen: next });
        // Re-fetch to get the updated isOpenNow flag from the server.
        reload();
      } catch (err) {
        const msg =
          err instanceof ApiClientError
            ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
            : (err as Error).message;
        setState((prev) => {
          if (prev.status !== 'ready') return prev;
          return { ...prev, saving: false, error: msg };
        });
      }
    },
    [reload],
  );

  return React.useMemo(() => ({ ...state, setOpen, reload }), [state, setOpen, reload]);
}
