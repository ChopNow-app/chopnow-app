import * as React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithIntlSync as render } from '@/tests/render-with-intl';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { OtpVerifyForm } from './OtpVerifyForm';
import { auth } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  auth: { verifyOtp: vi.fn(), requestOtp: vi.fn() },
}));

describe('OtpVerifyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls auth.verifyOtp on submit with the typed phone + code', async () => {
    const user = userEvent.setup();
    const onVerified = vi.fn();
    vi.mocked(auth.verifyOtp).mockResolvedValueOnce({
      accessToken: 'a',
      refreshToken: 'r',
    });

    render(<OtpVerifyForm phone="+237670000000" onVerified={onVerified} onResend={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('123456'), '123456');
    await user.click(screen.getByRole('button', { name: /valider/i }));

    await waitFor(() => {
      expect(auth.verifyOtp).toHaveBeenCalledWith('+237670000000', '123456');
      expect(onVerified).toHaveBeenCalled();
    });
  });

  it('surfaces a French error message on invalid OTP', async () => {
    const user = userEvent.setup();
    vi.mocked(auth.verifyOtp).mockRejectedValueOnce(new Error('otp_invalid_or_expired'));

    render(<OtpVerifyForm phone="+237670000000" onVerified={vi.fn()} onResend={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('123456'), '111111');
    await user.click(screen.getByRole('button', { name: /valider/i }));

    expect(await screen.findByText(/Code invalide/i)).toBeInTheDocument();
  });

  it('triggers onResend when the user clicks "Renvoyer le code"', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn().mockResolvedValue(undefined);

    render(<OtpVerifyForm phone="+237670000000" onVerified={vi.fn()} onResend={onResend} />);
    await user.click(screen.getByRole('button', { name: /renvoyer/i }));

    await waitFor(() => expect(onResend).toHaveBeenCalled());
  });

  it('does not call verifyOtp when the code is shorter than 6 digits', async () => {
    const user = userEvent.setup();
    render(<OtpVerifyForm phone="+237670000000" onVerified={vi.fn()} onResend={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('123456'), '123');
    await user.click(screen.getByRole('button', { name: /valider/i }));

    // The Zod validation runs synchronously on submit; verifyOtp is gated
    // behind a passing schema, so the API never fires.
    await waitFor(() => {
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    });
  });
});
