import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessTokenStore } from './access-token-store';

/**
 * Phase D2 (security audit close-out) — verify the BroadcastChannel
 * payload no longer carries the access token. A regression here would
 * re-open the same-origin XSS exfiltration window the audit flagged.
 */
describe('accessTokenStore — cross-tab message safety', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  let originalBroadcastChannel: typeof BroadcastChannel;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    originalBroadcastChannel = globalThis.BroadcastChannel;
    // Replace with a class so `new BroadcastChannel(...)` works.
    // Recording postMessage lets the test inspect the wire payload.
    class StubChannel {
      postMessage = postMessageSpy;
      close = vi.fn();
      // BroadcastChannel uses .onmessage assignment; the stub just
      // accepts the assignment without firing anything in this test.
      set onmessage(_: unknown) {}
    }
    globalThis.BroadcastChannel = StubChannel as unknown as typeof BroadcastChannel;

    accessTokenStore.clear();
  });

  afterEach(() => {
    globalThis.BroadcastChannel = originalBroadcastChannel;
    accessTokenStore.setCrossTabHandler(null);
    accessTokenStore.clear();
  });

  // accessTokenStore is a module singleton — the BroadcastChannel
  // instance it creates is cached for the test process lifetime. We
  // can only cleanly assert against the spy from the FIRST channel
  // instance created (the rest reuse it). That's fine: the broadcast
  // contract is the same for set + clear + any future broadcast call.
  it('every broadcast carries the auth-changed marker, NEVER the token', () => {
    // Subscribe so ensureChannel() runs and the channel is created
    // against our stubbed BroadcastChannel constructor.
    const unsub = accessTokenStore.subscribe(() => {});

    accessTokenStore.set('super-secret-jwt');
    accessTokenStore.set('rotated-jwt');
    accessTokenStore.clear();

    expect(postMessageSpy).toHaveBeenCalledTimes(3);
    for (const call of postMessageSpy.mock.calls) {
      expect(call[0]).toEqual({ type: 'auth-changed' });
      // Belt-and-braces: explicitly assert no token string leaks.
      const json = JSON.stringify(call[0]);
      expect(json).not.toContain('super-secret-jwt');
      expect(json).not.toContain('rotated-jwt');
    }
    unsub();
  });
});
