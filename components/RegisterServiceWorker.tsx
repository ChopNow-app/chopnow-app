'use client';

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
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);
  return null;
}
