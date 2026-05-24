'use client';

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';

// Register the service worker and auto-reload the page when a new SW takes
// control. Combined with sw.js's network-first navigation strategy, this
// closes the "users see old version after deploy" gap that broke us during
// the Phase 2 brand swap — new deploys now propagate within one page load.
//
// Update mechanics:
//   1. Page loads, calls register('/sw.js').
//   2. If the on-disk sw.js byte content has changed since the SW the
//      browser already has, the browser fetches the new SW and runs its
//      install handler. New SW calls skipWaiting() → activates immediately.
//   3. activate handler calls clients.claim() → current page now controlled
//      by the new SW → controllerchange fires here → we reload.
//   4. The reloaded page runs against the new HTML + assets.
//
// We skip the reload on FIRST registration (when there was no controller
// at mount time) so users opening the app fresh don't get a flash reload.
//
// Phase Obs-O3 — SW error bridge.
//   sw.js can't import Sentry directly (different JS context, different
//   bundle). It reports errors via postMessage; we forward to Sentry in
//   the page context (where Sentry IS initialized via sentry.client.config.ts).
//   See public/sw.js `reportToClients()`.
interface SwErrorPayload {
  source: 'sw';
  kind: 'error' | 'unhandledrejection';
  context: 'push' | 'notificationclick' | 'fetch' | 'global';
  message: string;
  stack: string | null;
  timestamp: number;
}

function isSwErrorPayload(data: unknown): data is SwErrorPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as SwErrorPayload).source === 'sw' &&
    ((data as SwErrorPayload).kind === 'error' ||
      (data as SwErrorPayload).kind === 'unhandledrejection')
  );
}

export function RegisterServiceWorker() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Capture whether the page started under SW control. If yes, any later
    // controllerchange is an update (not first registration) → reload.
    const hadControllerAtMount = !!navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Proactively check for an updated worker on each page load. The
        // browser also does this, but only roughly every ~24h by default.
        reg.update().catch(() => {});
      })
      .catch(() => {
        /* noop — service worker is optional */
      });

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      if (!hadControllerAtMount) return; // first-ever registration, skip
      refreshing = true;
      window.location.reload();
    };

    // Bridge: SW reports an error → page receives postMessage →
    // we synthesize an Error (so Sentry's stack trace logic works) and
    // capture it with the SW context as a tag for filtering in the
    // dashboard. The synthetic Error's stack is the SW-side stack
    // (already captured in the payload); we pass it through.
    const onMessage = (event: MessageEvent) => {
      if (!isSwErrorPayload(event.data)) return;
      const err = new Error(event.data.message);
      if (event.data.stack) err.stack = event.data.stack;
      Sentry.captureException(err, {
        tags: {
          source: 'service-worker',
          'sw.kind': event.data.kind,
          'sw.context': event.data.context,
        },
        extra: { timestamp: event.data.timestamp },
      });
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);
  return null;
}
