'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

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
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; categories: MenuCategory[] }
  | { status: 'error'; message: string };

/**
 * CRUD over /api/vendors/me/categories. The backend enforces a 2-category
 * cap for INFORMAL vendors; UI hides the category strip entirely for
 * INFORMAL so the cap is defence-in-depth.
 *
 * Mutations update the cache via `setQueryData` for instant UX (no
 * round-trip flash) AND then invalidate the query so any other surface
 * reading the same key picks up the change.
 */
export function useMenuCategories(): MenuCategoriesState & {
  createCategory(name: string): Promise<MenuCategory>;
  renameCategory(id: string, name: string): Promise<MenuCategory>;
  deleteCategory(id: string): Promise<void>;
  reload(): void;
} {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.vendor.menuCategories(),
    queryFn: () => apiRaw.get('/api/v1/vendors/me/categories') as Promise<MenuCategory[]>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRaw.post('/api/v1/vendors/me/categories', { name }) as Promise<MenuCategory>,
    onSuccess: (created) => {
      qc.setQueryData<MenuCategory[]>(queryKeys.vendor.menuCategories(), (prev) =>
        prev ? [...prev, created] : [created],
      );
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRaw.patch(`/api/v1/vendors/me/categories/${id}`, { name }) as Promise<MenuCategory>,
    onSuccess: (updated) => {
      qc.setQueryData<MenuCategory[]>(queryKeys.vendor.menuCategories(), (prev) =>
        prev?.map((c) => (c.id === updated.id ? updated : c)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRaw.delete(`/api/v1/vendors/me/categories/${id}`),
    onSuccess: (_data, id) => {
      qc.setQueryData<MenuCategory[]>(queryKeys.vendor.menuCategories(), (prev) =>
        prev?.filter((c) => c.id !== id),
      );
    },
  });

  const createCategory = React.useCallback(
    (name: string) => createMutation.mutateAsync(name),
    [createMutation],
  );
  const renameCategory = React.useCallback(
    (id: string, name: string) => renameMutation.mutateAsync({ id, name }),
    [renameMutation],
  );
  const deleteCategory = React.useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );
  const reload = React.useCallback(() => {
    void query.refetch();
  }, [query]);

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', createCategory, renameCategory, deleteCategory, reload };
    }
    return {
      status: 'error',
      message:
        query.error instanceof Error
          ? (query.error.message ?? 'Erreur de chargement')
          : 'Erreur de chargement',
      createCategory,
      renameCategory,
      deleteCategory,
      reload,
    };
  }
  if (query.data) {
    return {
      status: 'ready',
      categories: query.data,
      createCategory,
      renameCategory,
      deleteCategory,
      reload,
    };
  }
  return { status: 'loading', createCategory, renameCategory, deleteCategory, reload };
}
