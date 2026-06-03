// Tchop NoW service worker
// MVP scope: web push (VAPID) + offline-shell minimum. Grows per epic.
//
// Cache strategy (v0.2.0, 2026-05-16):
//   - Navigation requests (HTML): network-first, fall back to cached shell
//     when offline. Critical for the pilot — every deploy needs to reach
//     returning users within one page load, not after they nuke their cache.
//   - Everything else (Next.js hashed assets, images, fonts): cache-first.
//     Next.js hashes asset URLs (/_next/static/[hash].js) so the cache key
//     changes whenever the asset content changes — no stale-asset risk.
//
// Coupled with the controllerchange listener in RegisterServiceWorker.tsx,
// this means: open the app → new SW installs and activates immediately →
// page auto-reloads → user sees latest deploy. Total update propagation
// is one page load instead of "until next browser restart."

// Bumping CACHE_VERSION on every deploy that touches the SW evicts all old
// cached entries on activation (see the `activate` handler below — it deletes
// any cache whose key doesn't match the current version). Doing this on
// every deploy that ships a new manifest, asset strategy, or push payload
// shape guarantees PWA installs converge to the new behavior within one
// page load instead of "until the browser feels like checking 24h later".
const CACHE_VERSION = 'v0.6.0';

// Precache list — fetched on install and pinned to CACHE_VERSION. The
// /offline.html fallback is critical: when a navigation request fails
// offline AND the requested page isn't in cache, we serve this branded
// page instead of letting the browser render its default "no internet"
// chrome (which feels like a website, not an app).
const APP_SHELL = ['/', '/offline.html'];

const OFFLINE_FALLBACK = '/offline.html';

// Network-first paths beyond navigation requests. `/manifest.json` lives
// here because manifest updates need to reach installs as fast as the HTML
// does — caching it stale-first means a brand color tweak takes weeks to
// propagate (iOS even bakes some manifest fields at install, separate
// problem). Future first-class-citizen network-first paths get added here.
const NETWORK_FIRST_PATHS = new Set(['/manifest.json']);

// Phase Obs-O3 — Service worker error capture.
//
// The SW runs in a different JS context from the page; Sentry's browser
// SDK loaded in app/layout.tsx doesn't see SW errors. We bridge them by
// posting `{ source: 'sw', kind: 'error', context, message, stack }` to
// every controlled client. RegisterServiceWorker.tsx listens for that
// shape and forwards to Sentry.captureException() in the page context
// (where Sentry IS initialized).
//
// Why not Sentry's `@sentry/browser` SDK in the SW directly? The SDK's
// service-worker support is partial + adds ~30 KB to the SW bundle. The
// postMessage bridge is ~30 lines + adds zero KB to the SW.
function reportToClients(kind, context, error) {
  const payload = {
    source: 'sw',
    kind, // 'error' | 'unhandledrejection'
    context, // 'push' | 'notificationclick' | 'fetch' | 'global'
    // Stringify the error here — Error objects don't survive
    // postMessage's structured clone in all browsers (Safari quirks).
    message: error && error.message ? String(error.message) : String(error),
    stack: error && error.stack ? String(error.stack) : null,
    timestamp: Date.now(),
  };
  self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      for (const client of clientList) client.postMessage(payload);
    })
    .catch(() => {
      /* nothing to do — if we can't post, we can't post */
    });
}

// Global error trap — catches anything that escapes the handler-level
// try/catches below (e.g., a syntax error in this file would land here,
// though it'd more typically prevent SW registration entirely).
self.addEventListener('error', (event) => {
  reportToClients('error', 'global', event.error || { message: event.message });
});
self.addEventListener('unhandledrejection', (event) => {
  reportToClients('unhandledrejection', 'global', event.reason);
});

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  // skipWaiting() activates the new SW immediately on install rather than
  // waiting for every controlled tab to close. Combined with clients.claim()
  // below, the client picks up the new SW as soon as it's installed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Only intercept same-origin requests. Third-party calls (analytics,
  // Mapbox tiles, etc.) should go straight to the network.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation =
    req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  const isExplicitlyNetworkFirst = NETWORK_FIRST_PATHS.has(url.pathname);

  if (isNavigation || isExplicitlyNetworkFirst) {
    // Network-first: fresh content on every visit; fall back to cached
    // shell only when offline. This is what lets a deploy propagate fast.
    // Same strategy for `/manifest.json` so a brand colour / shortcut
    // tweak reaches installs within one page load.
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Keep the latest response in cache for offline use.
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached) return cached;
            if (!isNavigation) return undefined;
            // Navigation request failed offline + no cache hit → serve
            // branded offline page instead of falling back to '/'. The
            // old behavior silently dropped users on the home shell with
            // no offline indication; this gives them an explicit message
            // + retry button. The '/' fallback is the final safety net
            // in case /offline.html somehow wasn't precached.
            return caches
              .match(OFFLINE_FALLBACK)
              .then((offline) => offline || caches.match('/'));
          }),
        ),
    );
    return;
  }

  // Cache-first for static + hashed assets. Safe because filename hashes
  // change with content.
  event.respondWith(
    caches
      .match(req)
      .then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
      .catch((err) => {
        // Cache lookup itself can throw (storage quota exceeded, etc.).
        // Report so we know if this starts happening at scale, but
        // re-throw — there's no recovery from "the cache API broke".
        reportToClients('error', 'fetch', err);
        throw err;
      }),
  );
});

// Story 1.11: web push payload handler.
//
// Two responsibilities on every push:
//   1. Always show the OS-level notification (Chrome requires userVisibleOnly
//      so this is non-optional). On Android the system auto-suppresses the
//      banner when the PWA is foregrounded, so there's no double-display.
//   2. postMessage focused clients so an in-app listener can react before
//      the user even sees the notification — play a chime, refresh the
//      vendor dashboard, etc. This is what makes Web Push double as our
//      "live channel" without needing a separate SSE/WebSocket layer.
//
// Phase Obs-O3: wrap the whole handler body in a try/catch. A malformed
// payload (e.g., Campay sends a push with bad JSON) used to crash the
// handler silently — user got no notification + no breadcrumb. Now we
// report to Sentry via the postMessage bridge AND fall back to a generic
// "Une mise à jour Tchop NoW" notification so the user at least sees
// something.
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const data = (() => {
          try {
            return event.data ? event.data.json() : {};
          } catch {
            return { title: 'Tchop NoW', body: event.data ? event.data.text() : '' };
          }
        })();
        const title = data.title || 'Tchop NoW';
        const orderId = data.data && data.data.orderId;
        await Promise.all([
          self.registration.showNotification(title, {
            body: data.body,
            icon: data.icon || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: data.data || {},
            // tag collapses duplicate retries of the same order into one banner.
            tag: orderId || undefined,
          }),
          self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) =>
              clientList.forEach((client) => client.postMessage({ source: 'push', data })),
            ),
        ]);
      } catch (err) {
        reportToClients('error', 'push', err);
        // Belt-and-braces user-facing fallback. Without this, a push
        // handler crash leaves the user with no notification at all.
        try {
          await self.registration.showNotification('Tchop NoW', {
            body: 'Une mise à jour est disponible.',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
          });
        } catch {
          /* notification API itself broken — nothing useful to do */
        }
      }
    })(),
  );
});

// Tap a notification → open (or focus) the deep link. The backend includes
// `data.deepLink` for explicit routing; legacy payloads with just `orderId`
// keep working via the fallback below.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      try {
        const d = event.notification.data || {};
        const url = d.deepLink || (d.orderId ? `/orders/${d.orderId}` : '/');
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        // Focus an existing tab if one is open on the target URL — beats
        // opening a duplicate.
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      } catch (err) {
        reportToClients('error', 'notificationclick', err);
        // Best-effort fallback: open the app root so the user lands
        // somewhere instead of nothing happening.
        try {
          return await self.clients.openWindow('/');
        } catch {
          return undefined;
        }
      }
    })(),
  );
});
