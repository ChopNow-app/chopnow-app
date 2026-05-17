'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';

export type VendorType = 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
export type VendorStatus =
  | 'PENDING_REVIEW'
  | 'CORRECTION_REQUESTED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export interface VendorProfile {
  id: string;
  name: string;
  description: string | null;
  type: VendorType;
  status: VendorStatus;
  quartier: string;
  pointOfReference: string | null;
  whatsappPhone: string;
  momoPhone: string;
  badge: string | null;
  isOpen: boolean;
  profilePhotoUrl: string | null;
  coverPhotoUrl: string | null;
  declaredCapacity: number | null;
  createdAt: string;
  updatedAt: string;
}

export type VendorProfileState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; data: VendorProfile }
  | { status: 'error'; message: string };

/**
 * Reads `GET /api/vendors/me` (added in chopnow-api PR #166). Backs:
 *   - /vendor/profile editor (full data, edit name/description/momoPhone/photos)
 *   - /vendor/menu type-aware UI (INFORMAL keeps kind tabs, SEMI/RESTAURANT
 *     gets MenuCategory grouping)
 *
 * Deliberately minimal — no mutations here, just the read. The profile
 * editor wraps PATCH /vendors/me + /me/photo + /me/cover separately so a
 * partial save (e.g. only the cover photo changed) doesn't try to PATCH
 * empty text fields.
 */
export function useVendorProfile(): VendorProfileState & { reload(): void } {
  const [state, setState] = React.useState<VendorProfileState>({ status: 'idle' });
  const [tick, setTick] = React.useState(0);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    apiRaw
      .get<VendorProfile>('/api/vendors/me')
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          if (err.status === 401) return setState({ status: 'unauthenticated' });
          if (err.status === 404) return setState({ status: 'not_found' });
          const body = err.body as { message?: string } | undefined;
          return setState({
            status: 'error',
            message: body?.message ?? `Erreur ${err.status}`,
          });
        }
        setState({ status: 'error', message: (err as Error).message ?? 'Erreur réseau' });
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return React.useMemo(() => ({ ...state, reload }), [state, reload]);
}
