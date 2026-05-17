// ChopNow service worker
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

const CACHE_VERSION = 'v0.3.0';
const APP_SHELL = ['/'];

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

  if (isNavigation) {
    // Network-first: fresh HTML on every visit; fall back to cached shell
    // only when offline. This is what lets a deploy propagate fast.
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Keep the latest navigation response in cache for offline use.
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/'))),
    );
    return;
  }

  // Cache-first for static + hashed assets. Safe because filename hashes
  // change with content.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
        }
        return res;
      });
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
self.addEventListener('push', (event) => {
  const data = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: 'ChopNow', body: event.data ? event.data.text() : '' };
    }
  })();
  const title = data.title || 'ChopNow';
  const orderId = data.data && data.data.orderId;
  event.waitUntil(
    Promise.all([
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
          clientList.forEach((client) =>
            client.postMessage({ source: 'push', data }),
          ),
        ),
    ]),
  );
});

// Tap a notification → open (or focus) the deep link. The backend includes
// `data.deepLink` for explicit routing; legacy payloads with just `orderId`
// keep working via the fallback below.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.deepLink || (d.orderId ? `/orders/${d.orderId}` : '/');
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab if one is open on the target URL — beats
        // opening a duplicate.
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
