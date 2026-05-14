import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './types';

/**
 * Typed fetch client — uses the OpenAPI spec generated from chopnow-api.
 * Re-run `npm run codegen:api` after the backend ships new endpoints.
 *
 * Usage:
 *   const { data, error } = await api.POST('/api/auth/request-otp', {
 *     body: { phone: '670000000' },
 *   });
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const ACCESS_KEY = 'chopnow.access';
const REFRESH_KEY = 'chopnow.refresh';

export interface ApiError {
  statusCode: number;
  message: string;
  path?: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

function readAccess(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_KEY);
}
function readRefresh(): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_KEY);
}
function writeTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_KEY, accessToken);
  window.localStorage.setItem(REFRESH_KEY, refreshToken);
}
function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

// Story 1.2 — refresh-on-401. A single in-flight refresh shared across
// concurrent 401s so a fan-out of expired requests doesn't fire N parallel
// /auth/refresh calls.
let refreshInflight: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  const refreshToken = readRefresh();
  if (!refreshToken) return false;

  if (!refreshInflight) {
    refreshInflight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          clearTokens();
          return false;
        }
        const body = (await res.json()) as { accessToken: string; refreshToken: string };
        writeTokens(body.accessToken, body.refreshToken);
        return true;
      } catch {
        clearTokens();
        return false;
      } finally {
        refreshInflight = null;
      }
    })();
  }
  return refreshInflight;
}

// Auth bearer middleware. Reads the access token at request time AND retries
// once after a successful refresh on 401. Skips /api/auth/* to avoid loops.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = readAccess();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  async onResponse({ response, request }) {
    if (response.status !== 401) return response;
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth/')) return response;

    const ok = await refreshOnce();
    if (!ok) return response;

    const fresh = readAccess();
    if (!fresh) return response;
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${fresh}`);
    return fetch(request.url, {
      method: request.method,
      headers,
      body: request.body,
      credentials: request.credentials,
    });
  },
};

export const api = createClient<paths>({ baseUrl: API_URL });
api.use(authMiddleware);

/**
 * Lightweight legacy wrapper kept for the rare case where we need direct fetch
 * (file uploads, streaming). Prefer `api.GET / api.POST` for everything else.
 *
 * Note: does NOT participate in the refresh-on-401 flow — callers that need
 * that should use `api` instead.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readAccess();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiClientError(res.status, body);
  }
  return res.json() as Promise<T>;
}

export const apiRaw = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
  /**
   * Multipart upload — used for vendor item photos. Does NOT set Content-Type
   * so the browser fills in the boundary. Auth bearer is read from the same
   * storage key as `request`. Skips the refresh-on-401 flow.
   */
  upload: async <T>(
    path: string,
    form: FormData,
    method: 'POST' | 'PATCH' = 'PATCH',
  ): Promise<T> => {
    const token = readAccess();
    const res = await fetch(`${API_URL}${path}`, {
      method,
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiClientError(res.status, body);
    }
    return res.json() as Promise<T>;
  },
};
