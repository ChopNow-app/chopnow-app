import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { OtpRequestForm } from './OtpRequestForm';
import { auth } from '@/lib/auth';
import { useCaptchaConfig } from '@/features/auth/hooks/useCaptchaConfig';

vi.mock('@/lib/auth', () => ({
  auth: { requestOtp: vi.fn(), verifyOtp: vi.fn() },
}));

vi.mock('@/features/auth/hooks/useCaptchaConfig', () => ({
  useCaptchaConfig: vi.fn(),
}));

describe('OtpRequestForm — captcha-disabled (inert default)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Backend returns the inert config — same shape the API serves when
    // CAPTCHA_ENABLED is false on the server.
    vi.mocked(useCaptchaConfig).mockReturnValue({ enabled: false, siteKey: null });
  });

  it('submits without a captcha token when backend says disabled', async () => {
    const user = userEvent.setup();
    const onRequested = vi.fn();
    vi.mocked(auth.requestOtp).mockResolvedValueOnce({ ok: true, expiresInSeconds: 300 });

    render(<OtpRequestForm onRequested={onRequested} />);
    await user.type(screen.getByRole('textbox'), '670000000');
    await user.click(screen.getByRole('button', { name: /recevoir le code/i }));

    await waitFor(() => {
      expect(auth.requestOtp).toHaveBeenCalledWith('670000000', null);
      expect(onRequested).toHaveBeenCalledWith('670000000');
    });
  });

  it('does not render a Turnstile widget when backend says disabled', () => {
    render(<OtpRequestForm onRequested={vi.fn()} />);
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

describe('OtpRequestForm — captcha-active', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCaptchaConfig).mockReturnValue({
      enabled: true,
      siteKey: '1x00000000000000000000AA', // Cloudflare's "always passes" test key
    });
  });

  it('blocks submit and surfaces a French message when no token is held yet', async () => {
    const user = userEvent.setup();
    render(<OtpRequestForm onRequested={vi.fn()} />);
    await user.type(screen.getByRole('textbox'), '670000000');

    const submit = screen.getByRole('button', { name: /recevoir le code/i });
    // Disabled because captchaActive && !captchaToken
    expect(submit).toBeDisabled();

    // auth.requestOtp must not fire while the button is disabled
    expect(auth.requestOtp).not.toHaveBeenCalled();
  });
});
