'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

export type ItemKind = 'FOOD' | 'DRINK';
export type StockLevel = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceXAF: number;
  photoUrl: string | null;
  categoryId: string | null;
  isAvailable: boolean;
  isInStock: boolean;
  stockLevel: StockLevel;
  kind: ItemKind;
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
  kind?: ItemKind;
  stockLevel?: StockLevel;
}

export type MenuState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; items: MenuItem[] }
  | { status: 'error'; message: string };

export function useMenuItems(): MenuState & {
  setInStock(itemId: string, inStock: boolean): Promise<void>;
  setStockLevel(itemId: string, level: StockLevel): Promise<void>;
  createItem(input: MenuItemInput): Promise<MenuItem>;
  updateItem(itemId: string, input: MenuItemInput): Promise<MenuItem>;
  deleteItem(itemId: string): Promise<void>;
  uploadPhoto(itemId: string, file: File): Promise<MenuItem>;
  reload(): void;
} {
  const qc = useQueryClient();
  const key = queryKeys.vendor.menuItems();

  const query = useQuery({
    queryKey: key,
    queryFn: () => apiRaw.get('/api/vendors/me/items') as Promise<MenuItem[]>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
  });

  // Optimistic stock-level mutation with rollback. Used for both the
  // single-tap "out of stock" toggle and the 3-tier picker — the patch
  // body is the same shape (`{ stockLevel }`).
  const stockMutation = useMutation({
    mutationFn: ({ itemId, level }: { itemId: string; level: StockLevel }) =>
      apiRaw.patch(`/api/vendors/me/items/${itemId}/stock`, { stockLevel: level }),
    onMutate: async ({ itemId, level }) => {
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<MenuItem[]>(key);
      qc.setQueryData<MenuItem[]>(key, (prev) =>
        prev?.map((it) =>
          it.id === itemId ? { ...it, stockLevel: level, isInStock: level !== 'OUT_OF_STOCK' } : it,
        ),
      );
      return { snapshot };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(key, ctx.snapshot);
      if (err instanceof ApiClientError) {
        console.warn('stockLevel update failed', err.status, err.body);
      }
    },
  });

  const setInStock = React.useCallback(
    async (itemId: string, inStock: boolean) => {
      await stockMutation
        .mutateAsync({ itemId, level: inStock ? 'IN_STOCK' : 'OUT_OF_STOCK' })
        .catch(() => undefined);
    },
    [stockMutation],
  );

  const setStockLevel = React.useCallback(
    async (itemId: string, level: StockLevel) => {
      await stockMutation.mutateAsync({ itemId, level }).catch(() => undefined);
    },
    [stockMutation],
  );

  const createMutation = useMutation({
    mutationFn: (input: MenuItemInput) =>
      apiRaw.post('/api/vendors/me/items', input) as Promise<MenuItem>,
    onSuccess: (created) => {
      qc.setQueryData<MenuItem[]>(key, (prev) => (prev ? [...prev, created] : [created]));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, input }: { itemId: string; input: MenuItemInput }) =>
      apiRaw.put(`/api/vendors/me/items/${itemId}`, input) as Promise<MenuItem>,
    onSuccess: (updated) => {
      qc.setQueryData<MenuItem[]>(key, (prev) =>
        prev?.map((it) => (it.id === updated.id ? updated : it)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => apiRaw.delete(`/api/vendors/me/items/${itemId}`),
    onSuccess: (_data, itemId) => {
      qc.setQueryData<MenuItem[]>(key, (prev) => prev?.filter((it) => it.id !== itemId));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ itemId, file }: { itemId: string; file: File }) => {
      const form = new FormData();
      form.append('photo', file);
      return apiRaw.upload<MenuItem>(`/api/vendors/me/items/${itemId}/photo`, form, 'PATCH');
    },
    onSuccess: (updated) => {
      qc.setQueryData<MenuItem[]>(key, (prev) =>
        prev?.map((it) => (it.id === updated.id ? updated : it)),
      );
    },
  });

  const createItem = React.useCallback(
    (input: MenuItemInput) => createMutation.mutateAsync(input),
    [createMutation],
  );
  const updateItem = React.useCallback(
    (itemId: string, input: MenuItemInput) => updateMutation.mutateAsync({ itemId, input }),
    [updateMutation],
  );
  const deleteItem = React.useCallback(
    async (itemId: string) => {
      await deleteMutation.mutateAsync(itemId);
    },
    [deleteMutation],
  );
  const uploadPhoto = React.useCallback(
    (itemId: string, file: File) => uploadMutation.mutateAsync({ itemId, file }),
    [uploadMutation],
  );
  const reload = React.useCallback(() => {
    void query.refetch();
  }, [query]);

  const actions = {
    setInStock,
    setStockLevel,
    createItem,
    updateItem,
    deleteItem,
    uploadPhoto,
    reload,
  };

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', ...actions };
    }
    return {
      status: 'error',
      message: query.error instanceof Error ? query.error.message : 'Erreur réseau',
      ...actions,
    };
  }
  if (query.data) return { status: 'ready', items: query.data, ...actions };
  return { status: 'loading', ...actions };
}
