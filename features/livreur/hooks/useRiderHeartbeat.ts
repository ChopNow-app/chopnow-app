'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { apiRaw } from '@/lib/api/api-client';

/**
 * Story 4.4 — rider GPS heartbeat with Wakelock.
 *
 * When the rider is `isOnline`, this hook:
 *   1. Acquires a screen wakelock (so Android Chrome doesn't suspend the
 *      tab while the rider is driving)
 *   2. Subscribes to `geolocation.watchPosition` and pushes each fix to
 *      POST /riders/me/location
 *   3. Throttles to one POST every ~15s (POC-3 validated 15s cadence
 *      with no battery impact; throttler on the backend allows 12/min)
 *
 * Releases the wakelock + clears the watcher on cleanup or when `isOnline`
 * flips to false. Honesty UI: if the GPS denies / fails, surface the state
 * so the dashboard can show "Active la localisation" instead of pretending.
 */

const HEARTBEAT_MIN_INTERVAL_MS = 15_000;

export type HeartbeatState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'active'; lastSentAt: number; accuracyMeters: number }
  | { status: 'denied'; message: string }
  | { status: 'unsupported' };

// Minimal handle for the wakelock — we only need release().
type WakeLockHandle = { release(): Promise<void> };

export function useRiderHeartbeat(isOnline: boolean): HeartbeatState {
  const [state, setState] = React.useState<HeartbeatState>({ status: 'idle' });
  const wakeLockRef = React.useRef<WakeLockHandle | null>(null);
  const lastPostRef = React.useRef(0);

  React.useEffect(() => {
    if (!isOnline) {
      setState({ status: 'idle' });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unsupported' });
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;
    setState({ status: 'starting' });

    // Wakelock — best-effort; some browsers (iOS Safari < 18.4) don't
    // implement it. We still send heartbeats, just with the risk that
    // Android suspends the tab if the screen sleeps. The `as unknown`
    // cast carries us past TS's strict NavigatorWakeLock typing in CI
    // environments where lib.dom hasn't picked it up.
    const wakeLock = (
      navigator as unknown as {
        wakeLock?: { request: (kind: 'screen') => Promise<WakeLockHandle> };
      }
    ).wakeLock;
    void (async () => {
      try {
        if (wakeLock) {
          wakeLockRef.current = await wakeLock.request('screen');
        }
      } catch {
        /* no-op — wakelock is best-effort */
      }
    })();

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelled) return;
        const now = Date.now();
        if (now - lastPostRef.current < HEARTBEAT_MIN_INTERVAL_MS) {
          // Throttle to ≥15s between POSTs even if the browser fires
          // watchPosition more aggressively when the rider is moving.
          return;
        }
        lastPostRef.current = now;
        apiRaw
          .post('/api/riders/me/location', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
          .then(() => {
            if (cancelled) return;
            setState({ status: 'active', lastSentAt: now, accuracyMeters: pos.coords.accuracy });
          })
          .catch(() => {
            /* network blip — keep state and try again on the next fix */
          });
      },
      (err) => {
        if (cancelled) return;
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Permission de localisation refusée'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Position GPS indisponible'
              : 'Erreur de localisation';
        setState({ status: 'denied', message });
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );

    return () => {
      cancelled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (wakeLockRef.current) {
        void wakeLockRef.current.release().catch(() => undefined);
        wakeLockRef.current = null;
      }
    };
  }, [isOnline]);

  return state;
}
