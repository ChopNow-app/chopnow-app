'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Builds a fresh QueryClient with retries disabled and zero gc — keeps
 * tests deterministic (no shared cache leaking between cases, no retry
 * delays masking failures).
 */
export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithQueryClient(
  children: React.ReactNode,
  client = makeTestQueryClient(),
): { children: React.ReactNode } {
  return {
    children: <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  };
}

export function withQueryProvider(client = makeTestQueryClient()) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}
