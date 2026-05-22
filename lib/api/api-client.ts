import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './types';

/**
 * Typed fetch client — uses the OpenAPI spec generated from chopnow-api.
 * Re-run `npm run codegen:api` after the backend ships new endpoints.
 *
 * Usage:
 *   const { data, error } = await api.POST('/api/v1/auth/request-otp', {
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
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
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
    // Don't refresh on auth endpoints themselves (login, refresh, OTP), nor on
    // admin auth (separate session). Refresh would either loop or use the wrong
    // token type.
    if (
      url.pathname.startsWith('/api/v1/auth/') ||
      url.pathname.startsWith('/api/v1/admin/auth/')
    ) {
      return response;
    }

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

// === apiRaw — throw-based wrapper around the typed `api` client ===
//
// Why this exists alongside `api`:
//   - `api.GET/POST/...` returns `{ data, error, response }` — the OpenAPI-correct
//     shape, but verbose for one-liners and not ergonomic with try/catch.
//   - `apiRaw.get/post/...` keeps the original "await, then handle thrown
//     ApiClientError" style. ~68 call sites depend on this contract.
//
// As of the typing pass, `apiRaw` is overloaded:
//   1. When the path is a string literal known to the OpenAPI spec, the body
//      and response are fully typed from `paths` (and the explicit `<T>`
//      generic becomes redundant).
//   2. When the path is a template literal (e.g. `/api/v1/admin/vendors/${id}`),
//      TS falls through to the legacy `<T = unknown>` signature — same runtime,
//      same throw, just no compile-time check on body/response.
//
// All `apiRaw` calls now route through the typed `api` client internally, so
// they participate in the refresh-on-401 middleware that `api` already has.
// This fixes a latent bug where apiRaw users got booted on token expiry.

type Paths = keyof paths;
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type PathsForMethod<M extends Method> = {
  [P in Paths]: M extends keyof paths[P] ? P : never;
}[Paths];

type ReqJsonBody<P extends Paths, M extends Method> = M extends keyof paths[P]
  ? paths[P][M] extends { requestBody: { content: { 'application/json': infer B } } }
    ? B
    : paths[P][M] extends { requestBody?: { content: { 'application/json': infer B } } }
      ? B | undefined
      : undefined
  : undefined;

type ResJson<P extends Paths, M extends Method> = M extends keyof paths[P]
  ? paths[P][M] extends { responses: infer R }
    ? R extends { 200: { content: { 'application/json': infer T } } }
      ? T
      : R extends { 201: { content: { 'application/json': infer T } } }
        ? T
        : R extends { 204: unknown }
          ? void
          : unknown
    : unknown
  : unknown;

const METHOD_MAP: Record<Method, 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};

// Per-call overrides — currently just custom headers (e.g. Idempotency-Key on
// order placement). Intentionally narrow; new fields should be added explicitly
// rather than passing through a full RequestInit.
export interface ApiRawInit {
  headers?: Record<string, string>;
}

async function callTyped(
  method: Method,
  path: string,
  body?: unknown,
  init?: ApiRawInit,
): Promise<unknown> {
  const opts: Record<string, unknown> = {};
  if (body !== undefined) opts.body = body;
  if (init?.headers) opts.headers = init.headers;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (api as any)[METHOD_MAP[method]] as (
    p: string,
    o: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown; response: Response }>;
  const result = await fn(path, opts);
  if (!result.response.ok) {
    throw new ApiClientError(result.response.status, result.error ?? result.data ?? {});
  }
  return result.data;
}

export interface ApiRawClient {
  get<P extends PathsForMethod<'get'>>(path: P, init?: ApiRawInit): Promise<ResJson<P, 'get'>>;
  get<T = unknown>(path: string, init?: ApiRawInit): Promise<T>;

  post<P extends PathsForMethod<'post'>>(
    path: P,
    body: ReqJsonBody<P, 'post'>,
    init?: ApiRawInit,
  ): Promise<ResJson<P, 'post'>>;
  post<T = unknown>(path: string, body: unknown, init?: ApiRawInit): Promise<T>;

  put<P extends PathsForMethod<'put'>>(
    path: P,
    body: ReqJsonBody<P, 'put'>,
    init?: ApiRawInit,
  ): Promise<ResJson<P, 'put'>>;
  put<T = unknown>(path: string, body: unknown, init?: ApiRawInit): Promise<T>;

  patch<P extends PathsForMethod<'patch'>>(
    path: P,
    body: ReqJsonBody<P, 'patch'>,
    init?: ApiRawInit,
  ): Promise<ResJson<P, 'patch'>>;
  patch<T = unknown>(path: string, body: unknown, init?: ApiRawInit): Promise<T>;

  delete<P extends PathsForMethod<'delete'>>(
    path: P,
    init?: ApiRawInit,
  ): Promise<ResJson<P, 'delete'>>;
  delete<T = unknown>(path: string, init?: ApiRawInit): Promise<T>;

  // Multipart upload — used for vendor item photos. Browser sets Content-Type
  // boundary itself; auth bearer attached manually. Bypasses the typed client.
  upload<T>(path: string, form: FormData, method?: 'POST' | 'PATCH'): Promise<T>;
}

export const apiRaw: ApiRawClient = {
  get: ((path: string, init?: ApiRawInit) =>
    callTyped('get', path, undefined, init)) as ApiRawClient['get'],
  post: ((path: string, body: unknown, init?: ApiRawInit) =>
    callTyped('post', path, body, init)) as ApiRawClient['post'],
  put: ((path: string, body: unknown, init?: ApiRawInit) =>
    callTyped('put', path, body, init)) as ApiRawClient['put'],
  patch: ((path: string, body: unknown, init?: ApiRawInit) =>
    callTyped('patch', path, body, init)) as ApiRawClient['patch'],
  delete: ((path: string, init?: ApiRawInit) =>
    callTyped('delete', path, undefined, init)) as ApiRawClient['delete'],
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
