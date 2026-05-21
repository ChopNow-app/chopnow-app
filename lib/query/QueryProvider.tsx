'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClientError } from '@/lib/api/api-client';

/**
 * Project-wide TanStack Query setup.
 *
 * The QueryClient lives at the root layout. Defaults are tuned for our
 * polling-flavoured server data:
 *
 *  - `staleTime: 0` — every queryFn return is considered fresh for 0 ms, so
 *    a remount that finds cached data still triggers a background refetch.
 *    This matches the polling semantics we had before (always check the
 *    server) while adding the cache-hit UX win.
 *  - `gcTime: 5 min` — cached data sticks around for 5 minutes after the
 *    last component unmounts. Tab-switch / nav between pages → instant
 *    render from cache while a fresh fetch goes out in the background.
 *  - `refetchOnWindowFocus: true` — backgrounded PWAs come back fresh
 *    without waiting for the next interval tick. Important on iOS Safari
 *    where setTimeout is aggressively throttled in background tabs.
 *  - `refetchOnReconnect: true` — flaky Cameroon mobile data → recover
 *    cleanly on network resume.
 *  - `retry: smart` — don't retry on 4xx (auth / not-found / validation),
 *    do retry on 5xx and network errors. apiRaw throws ApiClientError
 *    with a `.status`, which we use to decide.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // 4xx → bail; 401/404/422 will not get any healthier with retries.
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
            return false;
          }
          // 5xx + network → up to 2 retries.
          return failureCount < 2;
        },
      },
      mutations: {
        // Mutations are user-initiated — don't auto-retry. The caller's
        // catch-block surfaces the error to the user explicitly.
        retry: false,
      },
    },
  });
}

// One client per browser session. SSR doesn't create a singleton — Next will
// re-render each request server-side with its own client (no shared cache).
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client (no cache leakage between requests).
    return makeQueryClient();
  }
  // Browser: lazily create once, reuse.
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures the client is created exactly once per component instance
  // (concurrent mode safe — React won't re-make the client across render passes).
  const [client] = React.useState(() => getQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
