'use client';

import { useEffect } from 'react';
import { bootRehydrate } from './boot';

/**
 * Mounted once near the root of the React tree. Fires the boot-time
 * /auth/refresh exchange so the in-memory access token is populated
 * before any auth-gated UI renders.
 *
 * Renders null — pure side-effect component. The status flows out
 * through `useSession()` (driven by the module-level boot store), not
 * through React context.
 */
export function SessionBoot() {
  useEffect(() => {
    bootRehydrate();
  }, []);
  return null;
}
