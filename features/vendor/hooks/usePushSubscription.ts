'use client';

import * as React from 'react';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { registerServiceWorker, subscribeToPush } from '@/lib/push';

const DEVICE_FINGERPRINT_KEY = 'chopnow.deviceFingerprint';

export type PushSubscriptionState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'denied' }
  | { status: 'prompt' }
  | { status: 'subscribing' }
  | { status: 'subscribed' }
  | { status: 'error'; message: string };

interface UsePushSubscription {
  state: PushSubscriptionState;
  request: () => Promise<void>;
}

/**
 * Vendor-facing Web Push subscription hook.
 *
 * Responsibilities:
 *   - Detect support (serviceWorker + Notification + PushManager) and the
 *     current permission state on mount.
 *   - On `request()`: ask for permission → register SW (idempotent) →
 *     subscribe via VAPID → POST the subscription JSON to the backend with
 *     a stable per-device opaque ID.
 *   - The deviceFingerprint is just a UUID minted on first call, persisted
 *     in localStorage. It's not a real fingerprint; it's the dedupe key
 *     the backend uses to upsert subscriptions (so re-granting permission
 *     doesn't create N orphan rows for the same physical device).
 *
 * Failure modes we DON'T retry: permission denied (user choice), unsupported
 * platform (iOS Safari without PWA install), VAPID misconfigured (backend
 * problem). All surface as a state — caller renders or hides the banner.
 */
export function usePushSubscription(): UsePushSubscription {
  const [state, setState] = React.useState<PushSubscriptionState>({ status: 'idle' });

  React.useEffect(() => {
    let cancelled = false;

    async function detect() {
      if (
        typeof window === 'undefined' ||
        !navigator.serviceWorker ||
        typeof Notification === 'undefined' ||
        typeof window.PushManager === 'undefined'
      ) {
        if (!cancelled) setState({ status: 'unsupported' });
        return;
      }
      if (Notification.permission === 'denied') {
        if (!cancelled) setState({ status: 'denied' });
        return;
      }
      if (Notification.permission === 'granted') {
        // Permission already granted on this device. Check whether the SW
        // also has a live PushSubscription — if it doesn't (e.g. user cleared
        // app data), we still need to expose the prompt so the banner re-runs
        // the subscribe call. Otherwise we're already done.
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!cancelled) setState({ status: sub ? 'subscribed' : 'prompt' });
        } catch {
          if (!cancelled) setState({ status: 'prompt' });
        }
        return;
      }
      if (!cancelled) setState({ status: 'prompt' });
    }

    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  const request = React.useCallback(async () => {
    setState({ status: 'subscribing' });
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState({ status: 'denied' });
        return;
      }
      if (permission !== 'granted') {
        // 'default' — user dismissed the prompt without choosing. Treat as
        // a soft no and let the banner re-offer on next mount.
        setState({ status: 'prompt' });
        return;
      }

      await registerServiceWorker();
      const subscription = await subscribeToPush();
      if (!subscription) {
        setState({
          status: 'error',
          message: 'VAPID non configuré côté serveur — réessaie plus tard.',
        });
        return;
      }

      const fingerprint = getOrCreateDeviceFingerprint();
      const json = subscription.toJSON();
      await apiRaw.post('/api/v1/notifications/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys, // { p256dh, auth }
        deviceFingerprint: fingerprint,
      });

      setState({ status: 'subscribed' });
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? `Erreur ${err.status}`
          : (err as Error)?.message || 'Erreur inconnue';
      setState({ status: 'error', message });
    }
  }, []);

  return { state, request };
}

function getOrCreateDeviceFingerprint(): string {
  let value = window.localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  if (!value) {
    value =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(DEVICE_FINGERPRINT_KEY, value);
  }
  return value;
}
