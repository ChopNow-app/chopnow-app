'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/auth';

type FormValues = { code: string };

export interface OtpVerifyFormProps {
  phone: string;
  onVerified: () => void;
  onResend: () => void | Promise<void>;
}

/**
 * Story 1.1 — second screen of the OTP flow. Lands after OtpRequestForm
 * fires. 6-digit code, 5-min server expiry, auto-focus + numeric keypad
 * so Android-mid-range users can paste from the WhatsApp message in one tap.
 */
export function OtpVerifyForm({ phone, onVerified, onResend }: OtpVerifyFormProps) {
  const t = useTranslations('Auth');
  const schema = React.useMemo(
    () =>
      z.object({
        code: z
          .string()
          .length(6, t('otpSchemaLength'))
          .regex(/^\d{6}$/, t('otpSchemaDigits')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
    mode: 'onBlur',
  });

  const [resending, setResending] = React.useState(false);
  const codeRef = React.useRef<HTMLInputElement | null>(null);
  // Auto-focus the code input on mount — most users land here from the
  // request form and immediately want to paste.
  React.useEffect(() => {
    codeRef.current?.focus();
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.verifyOtp(phone, values.code);
      onVerified();
    } catch (err) {
      // Backend surfaces "otp_invalid_or_expired" / "otp_too_many_attempts"
      // via ApiClientError; show a generic French message — both states are
      // recoverable by re-requesting the OTP.
      const msg = (err as Error).message?.includes('otp_too_many_attempts')
        ? t('otpTooManyAttempts')
        : t('otpInvalidExpired');
      setError('code', { message: msg });
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
    } finally {
      setResending(false);
    }
  };

  const { ref: codeRegisterRef, ...codeRegisterRest } = register('code');
  const codeFieldId = React.useId();
  const codeHintId = `${codeFieldId}-hint`;
  const codeErrorId = `${codeFieldId}-error`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor={codeFieldId} className="text-sm font-semibold text-chop-ink">
          {t('otpFieldLabel')}
        </label>
        <p id={codeHintId} className="text-sm text-muted-foreground">
          {t.rich('otpHelpWhatsApp', {
            phone,
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <Input
          {...codeRegisterRest}
          ref={(el) => {
            codeRegisterRef(el);
            codeRef.current = el;
          }}
          id={codeFieldId}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          aria-invalid={!!errors.code}
          // Link both the helper text and (when present) the validation
          // error so screen readers read "Code de vérification, Un code
          // de 6 chiffres a été envoyé… [Code invalide ou expiré]" when
          // focus lands on the input.
          aria-describedby={errors.code ? `${codeHintId} ${codeErrorId}` : codeHintId}
          aria-required="true"
        />
        {errors.code ? (
          <p id={codeErrorId} className="text-sm text-destructive">
            {errors.code.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('verifying') : t('validate')}
      </Button>

      <Button
        type="button"
        variant="ghost"
        disabled={resending}
        onClick={handleResend}
        className="w-full"
      >
        {resending ? t('resending') : t('resendCode')}
      </Button>
    </form>
  );
}
