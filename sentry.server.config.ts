// Sentry — server runtime (Node, App Router server components +
// route handlers + Server Actions).
//
// Sister file to sentry.client.config.ts; same inert-by-default
// contract via NEXT_PUBLIC_SENTRY_DSN. Server-side errors auto-
// captured by Sentry's Next.js wrapper (configured in next.config.ts).
//
// We READ the public DSN env var (not a separate SENTRY_DSN) because
// the server runtime sends to the same Sentry project as the browser
// — one project, two SDKs. Sentry distinguishes them via the
// `runtime.name` tag (set automatically).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
