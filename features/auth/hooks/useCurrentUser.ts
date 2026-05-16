'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
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
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: CurrentUser }
  | { status: 'error'; message: string };

/**
 * Resolves the current user from the access token, or reports `anonymous` if
 * no token is present. Cached in-memory per session — fetched once on mount,
 * survives page transitions inside the SPA. A fresh tab triggers a refetch.
 *
 * Used by the landing page to decide between role-picker (anonymous) and
 * auto-redirect (authenticated).
 */
export function useCurrentUser(): CurrentUserState {
  const [state, setState] = React.useState<CurrentUserState>({ status: 'idle' });

  React.useEffect(() => {
    let cancelled = false;
    if (!auth.isAuthenticated()) {
      setState({ status: 'anonymous' });
      return;
    }
    setState({ status: 'loading' });
    apiRaw
      .get<CurrentUser>('/api/users/me')
      .then((user) => {
        if (cancelled) return;
        setState({ status: 'authenticated', user });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) {
          // Stale token — clear it so the next decision is a clean anonymous.
          auth.clear();
          setState({ status: 'anonymous' });
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
  }, []);

  return state;
}
