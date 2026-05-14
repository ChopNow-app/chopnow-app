'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { api } from '@/lib/api/api-client';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceXAF: number;
  photoUrl: string | null;
  categoryId: string | null;
  isAvailable: boolean;
  isInStock: boolean;
  sortOrder: number;
}

export type MenuState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; items: MenuItem[] }
  | { status: 'error'; message: string };

export function useMenuItems(): MenuState & {
  setInStock(itemId: string, inStock: boolean): Promise<void>;
  reload(): void;
} {
  const [state, setState] = React.useState<MenuState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    api
      .GET('/api/vendors/me/items', {})
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
        setState({ status: 'ready', items: data as unknown as MenuItem[] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  /**
   * Story 2.10 — 1-tap stock toggle. Optimistic UI: flip locally first, roll
   * back on error so the next tap feels instant on flaky 3G.
   */
  const setInStock = React.useCallback(async (itemId: string, inStock: boolean) => {
    setState((prev) => {
      if (prev.status !== 'ready') return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, isInStock: inStock } : it)),
      };
    });
    try {
      await apiRaw.patch(`/api/vendors/me/items/${itemId}/stock`, { isInStock: inStock });
    } catch (err) {
      // Rollback on failure.
      setState((prev) => {
        if (prev.status !== 'ready') return prev;
        return {
          ...prev,
          items: prev.items.map((it) => (it.id === itemId ? { ...it, isInStock: !inStock } : it)),
        };
      });
      if (err instanceof ApiClientError) {
        // Surface to dev console; the UI flip-back is the user-visible cue.
        console.warn('stock toggle failed', err.status, err.body);
      }
    }
  }, []);

  return React.useMemo(() => ({ ...state, setInStock, reload }), [state, setInStock, reload]);
}
