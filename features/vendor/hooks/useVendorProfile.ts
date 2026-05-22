'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

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
  acceptsPreOrders: boolean;
  createdAt: string;
  updatedAt: string;
}

export type VendorProfileState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'not_found' }
  | { status: 'ready'; data: VendorProfile }
  | { status: 'error'; message: string };

/**
 * Reads `GET /api/vendors/me`. Backs the /vendor/profile editor and the
 * type-aware /vendor/menu UI. Mutations (PATCH /vendors/me, /me/photo,
 * /me/cover) live in their respective components and call
 * `queryClient.invalidateQueries({ queryKey: queryKeys.vendor.me() })`
 * after success so the dashboard updates without a manual reload.
 */
export function useVendorProfile(): VendorProfileState & { reload(): void } {
  const query = useQuery({
    queryKey: queryKeys.vendor.me(),
    queryFn: () => apiRaw.get('/api/v1/vendors/me') as Promise<VendorProfile>,
    retry: (count, err) => {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
        return false;
      }
      return count < 2;
    },
  });

  const reload = () => {
    void query.refetch();
  };

  if (query.isError) {
    if (query.error instanceof ApiClientError) {
      if (query.error.status === 401) return { status: 'unauthenticated', reload };
      if (query.error.status === 404) return { status: 'not_found', reload };
      const body = query.error.body as { message?: string } | undefined;
      return {
        status: 'error',
        message: body?.message ?? `Erreur ${query.error.status}`,
        reload,
      };
    }
    return { status: 'error', message: 'Erreur réseau', reload };
  }
  if (query.data) return { status: 'ready', data: query.data, reload };
  return { status: 'loading', reload };
}
