'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRaw } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';

export interface CaptchaConfig {
  enabled: boolean;
  siteKey: string | null;
}

const INERT: CaptchaConfig = { enabled: false, siteKey: null };

/**
 * Single source of truth for whether the Turnstile widget should render.
 * Reads the live state from the backend (`/auth/captcha-config`) so the
 * flag can be flipped via a backend env update alone — no Vercel rebuild.
 *
 * Edge-cached server-side for 60s; the TanStack query keeps it warm in
 * memory for the same window. On error (offline, server down) the hook
 * falls back to inert so the login form stays usable instead of dead-
 * locking on a missing captcha.
 */
export function useCaptchaConfig(): CaptchaConfig {
  const { data } = useQuery({
    queryKey: queryKeys.config.captcha(),
    queryFn: async () => {
      try {
        return (await apiRaw.get('/api/v1/auth/captcha-config')) as CaptchaConfig;
      } catch {
        return INERT;
      }
    },
    staleTime: 60_000,
    retry: 1,
  });
  return data ?? INERT;
}
