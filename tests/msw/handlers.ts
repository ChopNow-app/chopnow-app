import { http, HttpResponse } from 'msw';

/**
 * Default MSW handlers used by the Vitest suite.
 *
 * Each test file can extend or override these via
 *   `server.use(http.post('/api/...', () => HttpResponse.json({...})))`
 *
 * Conventions:
 *   - Endpoints match the absolute paths the chopnow-app code calls:
 *     `${NEXT_PUBLIC_API_URL}/api/v1/<route>`. The setup file pins
 *     NEXT_PUBLIC_API_URL to http://localhost:3001 so handlers can
 *     hardcode that origin.
 *   - "Anonymous" defaults (401 on user-scoped endpoints) match what
 *     real anonymous traffic sees from the backend. Tests for
 *     authenticated flows override per-test.
 */

const API = 'http://localhost:3001';

export const defaultHandlers = [
  // --- Auth ---
  // Anonymous default: no session. Tests for authenticated flows
  // override via server.use() to return { accessToken: 'fake-jwt' }.
  http.post(`${API}/api/v1/auth/refresh`, () =>
    HttpResponse.json({ message: 'No refresh cookie' }, { status: 401 }),
  ),
  http.get(`${API}/api/v1/users/me`, () =>
    HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 }),
  ),

  // --- Captcha config ---
  // Pilot default: captcha disabled. Backend's runtime
  // /auth/captcha-config endpoint controls whether Turnstile mounts.
  http.get(`${API}/api/v1/auth/captcha-config`, () =>
    HttpResponse.json({ enabled: false, siteKey: null }),
  ),

  // --- OTP ---
  http.post(`${API}/api/v1/auth/request-otp`, () =>
    HttpResponse.json({ sent: true, provider: 'whatsapp' }),
  ),

  // --- Catalogue ---
  http.get(`${API}/api/v1/catalogue`, () => HttpResponse.json({ vendors: [] })),
];
