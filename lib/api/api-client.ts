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

// Auth bearer middleware — reads from the auth helper (lib/auth) at request time
// so token refresh is transparent to callers.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    if (typeof window !== 'undefined') {
      const token = window.localStorage.getItem('chopnow.access');
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
};

export const api = createClient<paths>({ baseUrl: API_URL });
api.use(authMiddleware);

/**
 * Lightweight legacy wrapper kept for the rare case where we need direct fetch
 * (file uploads, streaming). Prefer `api.GET / api.POST` for everything else.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
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
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) => request<T>(path, { ...init, method: 'DELETE' }),
};
