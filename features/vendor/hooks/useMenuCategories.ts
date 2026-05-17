'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

export interface MenuCategory {
  id: string;
  vendorId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MenuCategoriesState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; categories: MenuCategory[] }
  | { status: 'error'; message: string };

/**
 * Sibling to useMenuItems. CRUD over /api/vendors/me/categories. The
 * backend enforces a 2-category cap for INFORMAL vendors; UI hides the
 * category strip entirely for INFORMAL so the cap shouldn't surface in
 * practice (defence-in-depth only).
 *
 * Pattern: optimistic-on-success, full reload on error. Categories rarely
 * change, so a worst-case extra GET on failure is fine.
 */
export function useMenuCategories(): MenuCategoriesState & {
  createCategory(name: string): Promise<MenuCategory>;
  renameCategory(id: string, name: string): Promise<MenuCategory>;
  deleteCategory(id: string): Promise<void>;
  reload(): void;
} {
  const [state, setState] = React.useState<MenuCategoriesState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiRaw
      .get<MenuCategory[]>('/api/vendors/me/categories')
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ready', categories: data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: (err as Error).message ?? 'Erreur de chargement',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const createCategory = React.useCallback(async (name: string): Promise<MenuCategory> => {
    const created = await apiRaw.post<MenuCategory>('/api/vendors/me/categories', { name });
    setState((prev) =>
      prev.status === 'ready' ? { ...prev, categories: [...prev.categories, created] } : prev,
    );
    return created;
  }, []);

  const renameCategory = React.useCallback(
    async (id: string, name: string): Promise<MenuCategory> => {
      const updated = await apiRaw.patch<MenuCategory>(`/api/vendors/me/categories/${id}`, {
        name,
      });
      setState((prev) =>
        prev.status === 'ready'
          ? {
              ...prev,
              categories: prev.categories.map((c) => (c.id === id ? updated : c)),
            }
          : prev,
      );
      return updated;
    },
    [],
  );

  const deleteCategory = React.useCallback(async (id: string): Promise<void> => {
    await apiRaw.delete(`/api/vendors/me/categories/${id}`);
    setState((prev) =>
      prev.status === 'ready'
        ? { ...prev, categories: prev.categories.filter((c) => c.id !== id) }
        : prev,
    );
  }, []);

  return React.useMemo(
    () => ({ ...state, createCategory, renameCategory, deleteCategory, reload }),
    [state, createCategory, renameCategory, deleteCategory, reload],
  );
}
