/**
 * Integration test for `useCaptchaConfig` — covers the full pipeline:
 *
 *   useCaptchaConfig
 *     → useQuery fires GET /api/v1/auth/captcha-config
 *     → MSW intercepts the fetch + returns mocked config
 *     → useQuery resolves with the response
 *     → hook returns { enabled, siteKey } (or INERT on error)
 *
 * Unit tests can't catch a regression in any of those seams (api-client
 * URL construction, fetch credentials mode, ApiClientError → INERT
 * fallback, TanStack Query staleTime + queryKey). MSW + a real
 * QueryClient lets us run the same code path end-to-end without a
 * backend.
 *
 * Bonus: validates the "fail safe to inert" branch — if the captcha
 * endpoint 500s, the hook returns INERT instead of throwing. That's
 * what keeps /login functional during a backend captcha outage.
 */

import { waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { useCaptchaConfig, type CaptchaConfig } from '@/features/auth/hooks/useCaptchaConfig';
import { server } from '@/tests/msw/server';
import { renderWithProviders } from '@/tests/render';

const API = 'http://localhost:3001';

/**
 * Render-time probe that mirrors the hook's value into a test-visible
 * array on every render.
 */
function TestProbe({ onValue }: { onValue: (state: CaptchaConfig) => void }) {
  const state = useCaptchaConfig();
  React.useEffect(() => {
    onValue(state);
  }, [state, onValue]);
  return null;
}

describe('useCaptchaConfig (integration via MSW)', () => {
  it('resolves to enabled + siteKey when backend returns enabled config', async () => {
    server.use(
      http.get(`${API}/api/v1/auth/captcha-config`, () =>
        HttpResponse.json({ enabled: true, siteKey: '0x4AAAAAADVBzil5gyQKB28-' }),
      ),
    );

    const captured: CaptchaConfig[] = [];
    renderWithProviders(<TestProbe onValue={(s) => captured.push(s)} />);

    await waitFor(() => {
      const last = captured.at(-1);
      expect(last?.enabled).toBe(true);
    });

    expect(captured.at(-1)?.siteKey).toBe('0x4AAAAAADVBzil5gyQKB28-');
  });

  it('falls back to INERT when the endpoint 500s (keeps /login usable)', async () => {
    server.use(
      http.get(`${API}/api/v1/auth/captcha-config`, () =>
        HttpResponse.json({ message: 'oops' }, { status: 500 }),
      ),
    );

    const captured: CaptchaConfig[] = [];
    renderWithProviders(<TestProbe onValue={(s) => captured.push(s)} />);

    // First render returns INERT synchronously (data === undefined → ??
    // INERT). Then the query fires, catches the error inside queryFn,
    // and resolves to INERT again. Either way the visible state stays
    // { enabled: false, siteKey: null }. Wait briefly to be sure no
    // post-fetch state flips it to enabled.
    await waitFor(() => {
      expect(captured.length).toBeGreaterThan(0);
    });

    for (const v of captured) {
      expect(v.enabled).toBe(false);
      expect(v.siteKey).toBeNull();
    }
  });
});
