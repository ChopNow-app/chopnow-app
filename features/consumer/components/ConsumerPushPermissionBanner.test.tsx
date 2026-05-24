import { render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsumerPushPermissionBanner } from './ConsumerPushPermissionBanner';

// Mock the push hook so the banner's render branches are exercised
// directly without touching real serviceWorker / Notification APIs.
const mockState = vi.hoisted(() => ({
  current: { status: 'prompt' as const },
}));
vi.mock('@/features/vendor/hooks/usePushSubscription', () => ({
  usePushSubscription: () => ({
    state: mockState.current,
    request: vi.fn(),
  }),
}));

describe('ConsumerPushPermissionBanner', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockState.current = { status: 'prompt' };
  });
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('hides on first page-view (PV < 2 threshold)', () => {
    render(<ConsumerPushPermissionBanner />);
    expect(screen.queryByText(/alerte/i)).not.toBeInTheDocument();
  });

  it('shows on second page-view when state=prompt', async () => {
    // Simulate one prior PV (e.g. the user already visited /restaurants
    // in this session before navigating to /orders where the banner is
    // also mounted).
    window.sessionStorage.setItem('chopnow.pvCount', '1');
    render(<ConsumerPushPermissionBanner />);
    expect(await screen.findByText(/alerte/i)).toBeInTheDocument();
  });

  it('stays hidden when permission is already subscribed', async () => {
    mockState.current = { status: 'subscribed' as never };
    window.sessionStorage.setItem('chopnow.pvCount', '5');
    render(<ConsumerPushPermissionBanner />);
    // Give effects a beat to run.
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(/alerte/i)).not.toBeInTheDocument();
  });

  it('persists dismissal in localStorage', async () => {
    window.sessionStorage.setItem('chopnow.pvCount', '2');
    render(<ConsumerPushPermissionBanner />);
    const dismiss = await screen.findByLabelText(/masquer/i);
    await act(async () => {
      dismiss.click();
    });
    expect(screen.queryByText(/alerte/i)).not.toBeInTheDocument();
    expect(window.localStorage.getItem('chopnow.consumerPushBannerDismissedAt')).toBeTruthy();
  });

  it('stays hidden if dismissed within the TTL window', async () => {
    window.sessionStorage.setItem('chopnow.pvCount', '5');
    window.localStorage.setItem('chopnow.consumerPushBannerDismissedAt', String(Date.now() - 1000));
    render(<ConsumerPushPermissionBanner />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(/alerte/i)).not.toBeInTheDocument();
  });

  it('re-surfaces once dismissal aged beyond the TTL', async () => {
    window.sessionStorage.setItem('chopnow.pvCount', '5');
    // 31 days ago — past the 30-day TTL.
    window.localStorage.setItem(
      'chopnow.consumerPushBannerDismissedAt',
      String(Date.now() - 31 * 24 * 60 * 60 * 1000),
    );
    render(<ConsumerPushPermissionBanner />);
    expect(await screen.findByText(/alerte/i)).toBeInTheDocument();
  });
});
