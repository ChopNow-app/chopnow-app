import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { accessTokenStore } from './access-token-store';

describe('accessTokenStore', () => {
  beforeEach(() => {
    accessTokenStore.clear();
  });

  afterEach(() => {
    accessTokenStore.clear();
  });

  it('starts empty', () => {
    expect(accessTokenStore.get()).toBeNull();
  });

  it('set + get round-trip', () => {
    accessTokenStore.set('jwt-abc');
    expect(accessTokenStore.get()).toBe('jwt-abc');
  });

  it('clear wipes the token', () => {
    accessTokenStore.set('jwt-abc');
    accessTokenStore.clear();
    expect(accessTokenStore.get()).toBeNull();
  });

  it('subscribers fire on every set + clear', () => {
    const listener = vi.fn();
    const off = accessTokenStore.subscribe(listener);

    accessTokenStore.set('jwt-1');
    accessTokenStore.set('jwt-2');
    accessTokenStore.clear();

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(1, 'jwt-1');
    expect(listener).toHaveBeenNthCalledWith(2, 'jwt-2');
    expect(listener).toHaveBeenNthCalledWith(3, null);
    off();
  });

  it('does not notify when the value is unchanged', () => {
    accessTokenStore.set('jwt-1');
    const listener = vi.fn();
    const off = accessTokenStore.subscribe(listener);

    accessTokenStore.set('jwt-1');
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it('unsubscribe stops further notifications', () => {
    const listener = vi.fn();
    const off = accessTokenStore.subscribe(listener);
    off();
    accessTokenStore.set('jwt-abc');
    expect(listener).not.toHaveBeenCalled();
  });
});
