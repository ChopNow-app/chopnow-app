// Next.js instrumentation hook — runs once per server bootstrap on
// both the Node and edge runtimes. We use it to load the right
// Sentry config file for the runtime.
//
// Required by @sentry/nextjs >= 8 (the old `sentry.{client,server}.
// config.ts` auto-loading model was removed). Without this file,
// the server + edge Sentry SDKs never initialize.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Required hook export for the Sentry SDK: forwards unhandled errors
// captured by Next.js's request lifecycle into Sentry. Without it,
// Server Action / route handler errors stay in the Next logs but
// never reach Sentry.
export { captureRequestError as onRequestError } from '@sentry/nextjs';
