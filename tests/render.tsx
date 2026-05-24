import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import * as React from 'react';

/**
 * Render helper that wires the providers a component normally has at
 * runtime: QueryClient (for `useQuery` / `useMutation`), and any future
 * context providers added here (i18n, theme, etc.).
 *
 * Each call creates a fresh QueryClient so tests don't leak cached
 * responses between cases. Retries disabled so MSW-returned errors
 * fail fast instead of waiting through 2 retry cycles.
 *
 * Use this for INTEGRATION tests (render a component that hits MSW-
 * intercepted endpoints). For pure unit tests of presentational
 * components, `@testing-library/react`'s vanilla `render` is fine.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions,
): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const result = render(ui, { wrapper: Wrapper, ...options });
  return { ...result, queryClient };
}
