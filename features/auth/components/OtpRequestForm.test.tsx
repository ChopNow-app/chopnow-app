import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { OtpRequestForm } from './OtpRequestForm';
import { auth } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  auth: { requestOtp: vi.fn(), verifyOtp: vi.fn() },
}));

describe('OtpRequestForm — captcha-disabled (inert default)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // CAPTCHA env vars are unset in the test environment, which is the
    // production-default shape. The widget should not render and the
    // submit button should accept submissions without a token.
  });

  it('submits without a captcha token when the flag is off', async () => {
    const user = userEvent.setup();
    const onRequested = vi.fn();
    vi.mocked(auth.requestOtp).mockResolvedValueOnce({ ok: true, expiresInSeconds: 300 });

    render(<OtpRequestForm onRequested={onRequested} />);
    await user.type(screen.getByRole('textbox'), '670000000');
    await user.click(screen.getByRole('button', { name: /recevoir le code/i }));

    await waitFor(() => {
      // Second arg is `undefined` (or absent) — the captcha token wasn't
      // collected because the widget never rendered.
      expect(auth.requestOtp).toHaveBeenCalledWith('670000000', null);
      expect(onRequested).toHaveBeenCalledWith('670000000');
    });
  });

  it('does not render a Turnstile widget when NEXT_PUBLIC_CAPTCHA_ENABLED is off', () => {
    render(<OtpRequestForm onRequested={vi.fn()} />);
    // The widget root from @marsidev/react-turnstile renders an iframe
    // with a `cf-turnstile` data attribute. In the inert default, none
    // of that DOM should exist.
    expect(document.querySelector('[data-cf-turnstile]')).toBeNull();
    expect(document.querySelector('iframe[src*="challenges.cloudflare.com"]')).toBeNull();
  });

  it('surfaces a French error message on API failure', async () => {
    const user = userEvent.setup();
    vi.mocked(auth.requestOtp).mockRejectedValueOnce(new Error('phone_rate_limited'));

    render(<OtpRequestForm onRequested={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), '670000000');
    await user.click(screen.getByRole('button', { name: /recevoir le code/i }));

    expect(await screen.findByText(/phone_rate_limited|Erreur réseau/i)).toBeInTheDocument();
  });
});
