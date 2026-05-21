'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiClientError, apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { queryKeys } from '@/lib/query/keys';
import type { UserRole } from '@/lib/auth/role-redirect';

export interface CurrentUser {
  id: string;
  phone: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
}

export type CurrentUserState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'error'; message: string };

/**
 * Resolves the current user from the access token, or reports `anonymous` if
 * no token is present. TanStack Query caches by `queryKey` so a fresh tab
 * triggers a refetch but page-to-page nav inside the SPA reuses the cache.
 *
 * Used by the landing page to decide between role-picker (anonymous) and
 * auto-redirect (authenticated).
 */
export function useCurrentUser(): CurrentUserState {
  const hasToken = typeof window !== 'undefined' && auth.isAuthenticated();

  const query = useQuery({
    queryKey: queryKeys.user.me(),
    queryFn: () => apiRaw.get('/api/users/me') as Promise<CurrentUser>,
    enabled: hasToken,
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 401) return false;
      return count < 2;
    },
  });

  if (!hasToken) return { status: 'anonymous' };
  if (query.isError) {
    if (query.error instanceof ApiClientError && query.error.status === 401) {
      // Stale token — clear it so the next render is a clean anonymous.
      auth.clear();
      return { status: 'anonymous' };
    }
    const message = query.error instanceof Error ? query.error.message : 'Erreur de chargement';
    return { status: 'error', message };
  }
  if (query.data) return { status: 'authenticated', user: query.data };
  return { status: 'loading' };
}
