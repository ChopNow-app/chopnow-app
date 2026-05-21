'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

// Day keys are 3-letter lowercase to match the backend's UpdateHoursDto.
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface DayHours {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM" 24h
}

export type WeeklyHours = Partial<Record<DayKey, DayHours>>;

export interface HoursPayload {
  hours: WeeklyHours;
  /** Server-derived; shows "ouvert maintenant" / "fermé" near the save button. */
  isOpenNow: boolean;
  /** The dashboard toggle, surfaced here so the UI can warn "n'oublie pas d'activer Ouvrir". */
  isOpen: boolean;
}

export type HoursState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; data: HoursPayload; saving: boolean; error: string | null }
  | { status: 'error'; message: string };

const READ_ENDPOINT = '/api/vendors/me/availability';
const WRITE_ENDPOINT = '/api/vendors/me/hours';

interface AvailabilityResponse {
  isOpen: boolean;
  isOpenNow: boolean;
  hours: WeeklyHours | null;
}

/**
 * Sibling to `useVendorAvailability`. Reads `/availability`; writes to
 * `/hours`. The save invalidates both query keys so the dashboard tile +
 * editor stay consistent.
 */
export function useVendorHours(): HoursState & {
  save(hours: WeeklyHours): Promise<void>;
  reload(): void;
} {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.vendor.hours(),
    queryFn: () => apiRaw.get(READ_ENDPOINT) as Promise<AvailabilityResponse>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
  });

  const mutation = useMutation({
    mutationFn: (hours: WeeklyHours) => apiRaw.put(WRITE_ENDPOINT, hours),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.vendor.hours() });
      // Dashboard tile reads from `availability` — keep them in lockstep.
      void qc.invalidateQueries({ queryKey: queryKeys.vendor.availability() });
    },
  });

  const save = React.useCallback(
    async (hours: WeeklyHours) => {
      await mutation.mutateAsync(hours);
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
      : (mutation.error.message ?? 'Erreur réseau')
    : null;

  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      return { status: 'unauthenticated', save, reload };
    }
    return {
      status: 'error',
      message:
        query.error instanceof Error
          ? (query.error.message ?? 'Erreur de chargement')
          : 'Erreur de chargement',
      save,
      reload,
    };
  }
  if (query.data) {
    return {
      status: 'ready',
      data: {
        hours: query.data.hours ?? {},
        isOpenNow: query.data.isOpenNow,
        isOpen: query.data.isOpen,
      },
      saving: mutation.isPending,
      error: mutationError,
      save,
      reload,
    };
  }
  return { status: 'loading', save, reload };
}
