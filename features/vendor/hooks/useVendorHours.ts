'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

/**
 * Day keys are 3-letter lowercase to match the backend's `UpdateHoursDto`
 * shape (see `chopnow-api/src/modules/catalogue/availability.dto.ts`).
 * Mon → "mon", etc. — sending a longer key like "monday" is silently
 * dropped by the DTO whitelist, which makes a typo invisible bug. Type
 * this tight to make wrong keys impossible.
 */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface DayHours {
  open: string; // "HH:MM" 24h
  close: string; // "HH:MM" 24h
}

export type WeeklyHours = Partial<Record<DayKey, DayHours>>;

export interface HoursPayload {
  hours: WeeklyHours;
  /** Server-derived; useful for showing "ouvert maintenant" / "fermé" status near the save button. */
  isOpenNow: boolean;
  /** The dashboard toggle, surfaced here so the UI can warn "n'oublie pas d'activer Ouvrir". */
  isOpen: boolean;
}

export type HoursState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'ready'; data: HoursPayload; saving: boolean; error: string | null }
  | { status: 'error'; message: string };

const ENDPOINT = '/api/vendors/me/availability';
const HOURS_ENDPOINT = '/api/vendors/me/hours';

/**
 * Sibling to `useVendorAvailability`. Read paths overlap (both hit
 * `/availability`) — kept separate so the hours editor doesn't drag the
 * dashboard's whole availability state machine along, and so a save here
 * doesn't have side-effects on the dashboard's `setOpen` flow.
 */
export function useVendorHours(): HoursState & {
  save(hours: WeeklyHours): Promise<void>;
  reload(): void;
} {
  const [state, setState] = React.useState<HoursState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiRaw
      .get<{ isOpen: boolean; isOpenNow: boolean; hours: WeeklyHours | null }>(ENDPOINT)
      .then((data) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: {
            hours: data.hours ?? {},
            isOpenNow: data.isOpenNow,
            isOpen: data.isOpen,
          },
          saving: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: (err as Error).message ?? `Erreur de chargement`,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const save = React.useCallback(async (hours: WeeklyHours) => {
    setState((prev) => (prev.status === 'ready' ? { ...prev, saving: true, error: null } : prev));
    try {
      // Empty body `{}` is valid and means "no schedule, manual toggle wins"
      // per availability.service.ts:86 — keep it explicit so a fully-cleared
      // form persists cleanly rather than triggering a "no body" error.
      await apiRaw.put<unknown>(HOURS_ENDPOINT, hours);
      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, data: { ...prev.data, hours }, saving: false, error: null }
          : prev,
      );
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : ((err as Error).message ?? 'Erreur réseau');
      setState((prev) =>
        prev.status === 'ready' ? { ...prev, saving: false, error: message } : prev,
      );
      throw err;
    }
  }, []);

  return React.useMemo(() => ({ ...state, save, reload }), [state, save, reload]);
}
