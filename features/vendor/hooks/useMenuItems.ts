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
  preparationMinutes?: number | null;
}

export interface MenuItemInput {
  name: string;
  description?: string;
  priceXAF: number;
  categoryId?: string;
  preparationMinutes?: number;
  sortOrder?: number;
}

export type MenuState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; items: MenuItem[] }
  | { status: 'error'; message: string };

export function useMenuItems(): MenuState & {
  setInStock(itemId: string, inStock: boolean): Promise<void>;
  createItem(input: MenuItemInput): Promise<MenuItem>;
  updateItem(itemId: string, input: MenuItemInput): Promise<MenuItem>;
  deleteItem(itemId: string): Promise<void>;
  uploadPhoto(itemId: string, file: File): Promise<MenuItem>;
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
      setState((prev) => {
        if (prev.status !== 'ready') return prev;
        return {
          ...prev,
          items: prev.items.map((it) => (it.id === itemId ? { ...it, isInStock: !inStock } : it)),
        };
      });
      if (err instanceof ApiClientError) {
        console.warn('stock toggle failed', err.status, err.body);
      }
    }
  }, []);

  /**
   * Story 2.2 / 2.3 — create. The backend caps informal vendors at 15 items
   * and surfaces `menu_limit_reached` — let the editor render that message.
   */
  const createItem = React.useCallback(async (input: MenuItemInput): Promise<MenuItem> => {
    const created = await apiRaw.post<MenuItem>('/api/vendors/me/items', input);
    setState((prev) =>
      prev.status === 'ready' ? { ...prev, items: [...prev.items, created] } : prev,
    );
    return created;
  }, []);

  const updateItem = React.useCallback(
    async (itemId: string, input: MenuItemInput): Promise<MenuItem> => {
      const updated = await apiRaw.put<MenuItem>(`/api/vendors/me/items/${itemId}`, input);
      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, items: prev.items.map((it) => (it.id === itemId ? updated : it)) }
          : prev,
      );
      return updated;
    },
    [],
  );

  const deleteItem = React.useCallback(async (itemId: string): Promise<void> => {
    await apiRaw.delete(`/api/vendors/me/items/${itemId}`);
    setState((prev) =>
      prev.status === 'ready'
        ? { ...prev, items: prev.items.filter((it) => it.id !== itemId) }
        : prev,
    );
  }, []);

  /**
   * Story 2.11 — vendor photo upload. multipart/form-data; the browser sets
   * the boundary header (do NOT set Content-Type manually).
   */
  const uploadPhoto = React.useCallback(async (itemId: string, file: File): Promise<MenuItem> => {
    const form = new FormData();
    form.append('photo', file);
    const updated = await apiRaw.upload<MenuItem>(
      `/api/vendors/me/items/${itemId}/photo`,
      form,
      'PATCH',
    );
    setState((prev) =>
      prev.status === 'ready'
        ? { ...prev, items: prev.items.map((it) => (it.id === itemId ? updated : it)) }
        : prev,
    );
    return updated;
  }, []);

  return React.useMemo(
    () => ({ ...state, setInStock, createItem, updateItem, deleteItem, uploadPhoto, reload }),
    [state, setInStock, createItem, updateItem, deleteItem, uploadPhoto, reload],
  );
}
