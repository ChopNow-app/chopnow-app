import { setupServer } from 'msw/node';
import { defaultHandlers } from './handlers';

/**
 * Singleton MSW server for the Vitest suite. Started + stopped in
 * tests/setup.ts so every test file gets fetch interception for free.
 *
 * Per-test overrides:
 *   import { server } from '@/tests/msw/server';
 *   import { http, HttpResponse } from 'msw';
 *
 *   it('handles 500 from catalogue', () => {
 *     server.use(http.get('http://localhost:3001/api/v1/catalogue', () =>
 *       HttpResponse.json({}, { status: 500 })));
 *     // ...
 *   });
 */
export const server = setupServer(...defaultHandlers);
