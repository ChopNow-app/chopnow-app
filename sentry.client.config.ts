// Sentry — client (browser) runtime.
//
// Loaded on every page in the browser. Captures uncaught errors,
// unhandled promise rejections, and (when tracesSampleRate > 0)
// auto-instruments fetch / XHR / page navigations into spans.
//
// # Inert-by-default contract
//
// Empty `NEXT_PUBLIC_SENTRY_DSN` → `Sentry.init` returns without
// installing the SDK → zero beacons, zero overhead. This lets us
// ship the wiring code before the Sentry project exists, and run
// the dev server / tests without "no DSN configured" warnings.
//
// To enable in prod: set NEXT_PUBLIC_SENTRY_DSN in the Vercel
// project's Production environment. The DSN is public-safe (clients
// use it to authenticate to Sentry's ingest endpoint); committing it
// to env is fine, but we keep it in Vercel env vars for hygiene.
//
// # PII redaction (Cameroon market — ANTIC/ART regulatory + general)
//
// `sendDefaultPii: false` blocks Sentry from auto-attaching IP +
// user-agent details. `beforeSend` is the additional filter to strip
// phone numbers + delivery addresses from breadcrumbs + error
// messages. Sentry's automatic data scrubber catches obvious
// credit-card patterns but NOT African phone formats (6XXXXXXXX) or
// quartier names — we add those.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Cameroon phone format: 6 followed by 8 digits, optionally with +237
// prefix. Captures both "670000000" and "+237670000000" surfaces.
const CAMEROON_PHONE_RE = /(\+?237)?\s?6[5-9]\d{7}/g;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    // Pilot-scale: 10% trace sampling. Auto-instruments every fetch
    // (apiRaw + api openapi-fetch + native) into a span so API
    // latency is visible per endpoint. Bump to 1.0 if free-tier
    // headroom allows it; drop if cost spikes.
    tracesSampleRate: 0.1,
    // No session replay at pilot scale — covered in the audit's
    // dimension #4 (deferred to scale-up).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip phone numbers from error message + breadcrumb data.
      // Walk only the surfaces an exception path typically touches —
      // exhaustive deep-clone every property would slow down the
      // capture hot path on slow phones.
      if (event.message) {
        event.message = event.message.replace(CAMEROON_PHONE_RE, '[phone-redacted]');
      }
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = ex.value.replace(CAMEROON_PHONE_RE, '[phone-redacted]');
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.message) {
        breadcrumb.message = breadcrumb.message.replace(CAMEROON_PHONE_RE, '[phone-redacted]');
      }
      return breadcrumb;
    },
  });
}
