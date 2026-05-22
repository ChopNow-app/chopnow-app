import * as React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { usePushSubscription, type PushSubscriptionState } from './usePushSubscription';
import { apiRaw } from '@/lib/api/api-client';
import * as pushLib from '@/lib/push';

vi.mock('@/lib/api/api-client', () => ({
  apiRaw: { post: vi.fn() },
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: unknown,
    ) {
      super(`API ${status}`);
    }
  },
}));

vi.mock('@/lib/push', () => ({
  registerServiceWorker: vi.fn().mockResolvedValue({}),
  subscribeToPush: vi.fn(),
}));

// Tiny probe that surfaces the hook's internal state to the test.
function Probe({
  onState,
  action,
}: {
  onState: (s: PushSubscriptionState) => void;
  action?: (req: () => Promise<void>) => void;
}) {
  const { state, request } = usePushSubscription();
  React.useEffect(() => {
    onState(state);
  }, [state, onState]);
  React.useEffect(() => {
    if (action) action(request);
  }, [action, request]);
  return null;
}

describe('usePushSubscription', () => {
  // Stash the original navigator so we can fully replace it per-test and
  // restore in afterEach. JSDOM ships a stubbed navigator but doesn't expose
  // PushManager/serviceWorker by default.
  const originalNotification = (globalThis as { Notification?: unknown }).Notification;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    (globalThis as { Notification?: unknown }).Notification = originalNotification;
  });

  function stubEnvironment(opts: {
    serviceWorker?: boolean;
    pushManager?: boolean;
    notification?: 'granted' | 'denied' | 'default' | 'absent';
  }): void {
    if (opts.serviceWorker === false) {
      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });
    } else {
      Object.defineProperty(window.navigator, 'serviceWorker', {
        value: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
            },
          }),
        },
        configurable: true,
      });
    }
    if (opts.pushManager === false) {
      // Force absence by deleting from window.
      // @ts-expect-error - intentional test stubbing
      delete window.PushManager;
    } else {
      // @ts-expect-error - intentional test stubbing
      window.PushManager = class {};
    }
    if (opts.notification === 'absent') {
      (globalThis as { Notification?: unknown }).Notification = undefined;
    } else if (opts.notification) {
      (globalThis as { Notification?: unknown }).Notification = Object.assign(
        function () {
          /* noop */
        },
        {
          permission: opts.notification,
          requestPermission: vi.fn().mockResolvedValue(opts.notification),
        },
      );
    }
  }

  it("reports 'unsupported' when serviceWorker is unavailable", async () => {
    stubEnvironment({ serviceWorker: false, notification: 'default' });
    const states: PushSubscriptionState[] = [];
    render(<Probe onState={(s) => states.push(s)} />);
    await waitFor(() => expect(states.at(-1)?.status).toBe('unsupported'));
  });

  it("reports 'unsupported' when PushManager is unavailable (iOS Safari without PWA install)", async () => {
    stubEnvironment({ pushManager: false, notification: 'default' });
    const states: PushSubscriptionState[] = [];
    render(<Probe onState={(s) => states.push(s)} />);
    await waitFor(() => expect(states.at(-1)?.status).toBe('unsupported'));
  });

  it("reports 'denied' when permission is already denied", async () => {
    stubEnvironment({ notification: 'denied' });
    const states: PushSubscriptionState[] = [];
    render(<Probe onState={(s) => states.push(s)} />);
    await waitFor(() => expect(states.at(-1)?.status).toBe('denied'));
  });

  it("reports 'prompt' when permission is default", async () => {
    stubEnvironment({ notification: 'default' });
    const states: PushSubscriptionState[] = [];
    render(<Probe onState={(s) => states.push(s)} />);
    await waitFor(() => expect(states.at(-1)?.status).toBe('prompt'));
  });

  it('subscribes happy-path: request → permission granted → POST to /api/notifications/push/subscribe', async () => {
    stubEnvironment({ notification: 'default' });
    const subscriptionMock = {
      toJSON: () => ({
        endpoint: 'https://fcm.googleapis.com/abc',
        keys: { p256dh: 'pub-key', auth: 'auth-key' },
      }),
    } as unknown as PushSubscription;
    vi.mocked(pushLib.subscribeToPush).mockResolvedValueOnce(subscriptionMock);
    // After request(): requestPermission returns 'granted'
    (globalThis as { Notification: typeof Notification }).Notification = Object.assign(
      function () {
        /* noop */
      } as unknown as typeof Notification,
      {
        permission: 'default' as NotificationPermission,
        requestPermission: vi.fn().mockResolvedValue('granted' as NotificationPermission),
      },
    );
    vi.mocked(apiRaw.post).mockResolvedValueOnce({ id: 'sub-1' });

    const states: PushSubscriptionState[] = [];
    let requestFn: (() => Promise<void>) | null = null;
    render(
      <Probe
        onState={(s) => states.push(s)}
        action={(req) => {
          requestFn = req;
        }}
      />,
    );

    await waitFor(() => expect(requestFn).not.toBeNull());
    await act(async () => {
      await requestFn!();
    });

    expect(apiRaw.post).toHaveBeenCalledWith(
      '/api/v1/notifications/push/subscribe',
      expect.objectContaining({
        endpoint: 'https://fcm.googleapis.com/abc',
        keys: { p256dh: 'pub-key', auth: 'auth-key' },
        deviceFingerprint: expect.any(String),
      }),
    );
    expect(states.at(-1)?.status).toBe('subscribed');
  });

  it('flips to denied when the user dismisses with "denied"', async () => {
    stubEnvironment({ notification: 'default' });
    (globalThis as { Notification: typeof Notification }).Notification = Object.assign(
      function () {
        /* noop */
      } as unknown as typeof Notification,
      {
        permission: 'default' as NotificationPermission,
        requestPermission: vi.fn().mockResolvedValue('denied' as NotificationPermission),
      },
    );

    const states: PushSubscriptionState[] = [];
    let requestFn: (() => Promise<void>) | null = null;
    render(
      <Probe
        onState={(s) => states.push(s)}
        action={(req) => {
          requestFn = req;
        }}
      />,
    );

    await waitFor(() => expect(requestFn).not.toBeNull());
    await act(async () => {
      await requestFn!();
    });
    expect(states.at(-1)?.status).toBe('denied');
    expect(apiRaw.post).not.toHaveBeenCalled();
  });
});
