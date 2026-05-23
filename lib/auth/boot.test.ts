import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accessTokenStore } from './access-token-store';
import { __resetBootForTests, bootRehydrate, getBootStatus } from './boot';

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('bootRehydrate', () => {
  beforeEach(() => {
    accessTokenStore.clear();
    window.localStorage.clear();
    __resetBootForTests();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('cookie path → seeds the access token + resolves to authenticated', async () => {
    mockFetch(async (url) => {
      expect(url).toContain('/api/v1/auth/refresh');
      return jsonResponse(200, { accessToken: 'fresh-access', refreshToken: 'ignored' });
    });

    await expect(bootRehydrate()).resolves.toBe('authenticated');
    expect(accessTokenStore.get()).toBe('fresh-access');
    expect(getBootStatus()).toBe('authenticated');
  });

  it('legacy localStorage refresh → migrates + wipes the legacy keys', async () => {
    window.localStorage.setItem('chopnow.refresh', 'legacy-rt');
    window.localStorage.setItem('chopnow.access', 'legacy-access');

    let calls = 0;
    mockFetch(async (_url, init) => {
      calls += 1;
      if (calls === 1) return jsonResponse(401, { code: 'refresh_invalid_or_expired' });
      // Second call should carry the legacy refresh token in the body.
      expect(init?.body).toBe(JSON.stringify({ refreshToken: 'legacy-rt' }));
      return jsonResponse(200, { accessToken: 'migrated-access' });
    });

    await expect(bootRehydrate()).resolves.toBe('authenticated');
    expect(accessTokenStore.get()).toBe('migrated-access');
    expect(window.localStorage.getItem('chopnow.refresh')).toBeNull();
    expect(window.localStorage.getItem('chopnow.access')).toBeNull();
  });

  it('Phase D1 — wipes any pre-D1 chopnow.admin.token from localStorage on boot', async () => {
    window.localStorage.setItem('chopnow.admin.token', 'stale-admin-jwt');
    mockFetch(async () => jsonResponse(401, {}));

    // No cookie path, no legacy refresh → still anonymous (the admin
    // localStorage seed is NOT trusted post-D1).
    await expect(bootRehydrate()).resolves.toBe('anonymous');
    expect(accessTokenStore.get()).toBeNull();
    // And the stale key is wiped so an XSS post-boot can't read it.
    expect(window.localStorage.getItem('chopnow.admin.token')).toBeNull();
  });

  it('no cookie, no legacy → anonymous', async () => {
    mockFetch(async () => jsonResponse(401, {}));

    await expect(bootRehydrate()).resolves.toBe('anonymous');
    expect(accessTokenStore.get()).toBeNull();
    expect(getBootStatus()).toBe('anonymous');
  });

  it('is idempotent — concurrent calls share the same in-flight refresh', async () => {
    let calls = 0;
    mockFetch(async () => {
      calls += 1;
      return jsonResponse(200, { accessToken: 'jwt' });
    });

    const [a, b] = await Promise.all([bootRehydrate(), bootRehydrate()]);
    expect(a).toBe('authenticated');
    expect(b).toBe('authenticated');
    expect(calls).toBe(1);
  });
});
