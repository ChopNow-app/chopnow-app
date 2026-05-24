import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// MSW lifecycle — start the request-interception server before any
// test runs, reset handlers between tests (so per-test overrides via
// `server.use()` don't leak), and tear down after the suite.
//
// `onUnhandledRequest: 'bypass'` lets requests that no handler matches
// pass through to the real network — useful for `next/font` Google
// Fonts fetches during component render that aren't worth mocking.
// For strict mode, switch to 'error' once we know every fetch path.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
