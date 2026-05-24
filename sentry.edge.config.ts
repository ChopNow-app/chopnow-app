// Sentry — edge runtime (proxy.ts middleware + Next.js edge route
// handlers). Same inert-by-default contract.
//
// Edge runtime has a stripped-down Sentry SDK (no Node-specific APIs).
// Still covers uncaught errors in our proxy.ts route guard +
// per-request CSP header setup.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}
