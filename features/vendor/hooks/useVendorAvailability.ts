'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

export interface AvailabilityView {
  isOpen: boolean;
  isOpenNow: boolean;
  hours: Record<string, { open: string; close: string }> | null;
}

export type AvailabilityState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; data: AvailabilityView; saving: boolean; error: string | null }
  | { status: 'error'; message: string };

/**
 * Story 2.4 — single-source-of-truth for vendor availability + hours on the
 * dashboard. GET /vendors/me/availability on mount, PATCH same path to flip
 * the toggle. Mutation invalidates the query so isOpenNow updates instantly.
 */
export function useVendorAvailability(): AvailabilityState & {
  setOpen(next: boolean): Promise<void>;
  reload(): void;
} {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.vendor.availability(),
    queryFn: () => apiRaw.get('/api/vendors/me/availability') as Promise<AvailabilityView>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
  });

  const mutation = useMutation({
    mutationFn: (next: boolean) => apiRaw.patch('/api/vendors/me/availability', { isOpen: next }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vendor.availability() });
    },
  });

  const setOpen = React.useCallback(
    async (next: boolean) => {
      await mutation.mutateAsync(next).catch(() => undefined);
    },
    [mutation],
  );
  const reload = React.useCallback(() => {
    void query.refetch();
  }, [query]);

  const mutationError = mutation.error
    ? mutation.error instanceof ApiClientError
      ? ((mutation.error.body as { message?: string } | undefined)?.message ??
        `Erreur ${mutation.error.status}`)
      : mutation.error.message
    : null;

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', setOpen, reload };
    }
    const message =
      query.error instanceof ApiClientError ? `Erreur ${query.error.status}` : 'Erreur réseau';
    return { status: 'error', message, setOpen, reload };
  }
  if (query.data) {
    return {
      status: 'ready',
      data: query.data,
      saving: mutation.isPending,
      error: mutationError,
      setOpen,
      reload,
    };
  }
  return { status: 'loading', setOpen, reload };
}
