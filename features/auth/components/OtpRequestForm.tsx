'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/PhoneInput';
import { auth } from '@/lib/auth';
import { useCaptchaConfig } from '@/features/auth/hooks/useCaptchaConfig';

// Lazy: the Turnstile widget is ~30 KB and only renders when the backend's
// CAPTCHA_ENABLED flag is on (fetched at runtime via /auth/captcha-config).
// Most pilot installs run with captcha disabled, so deferring the bundle
// saves the full weight on the common login path. `ssr: false` because
// Turnstile is a third-party iframe-mounting widget that has no SSR shape.
const Turnstile = dynamic(
  () => import('@marsidev/react-turnstile').then((m) => ({ default: m.Turnstile })),
  { ssr: false },
);

/**
 * Canonical example of the form pattern devs should copy for Sprint 1 stories:
 *   - zod schema beside the component
 *   - react-hook-form + zodResolver for validation
 *   - typed onSubmit
 *   - server errors surfaced via setError('root', ...)
 *   - disabled state during submission
 *
 * Cloudflare Turnstile (bot-protection) state is fetched at runtime from
 * `/auth/captcha-config` so the widget can be turned on without a Vercel
 * rebuild — the backend's CAPTCHA_ENABLED + TURNSTILE_SITE_KEY env vars
 * are the single source of truth.
 */

// Accept E.164 international (matches PhoneInput's emit format) OR the
// legacy bare 9-digit Cameroon local format. Same shape as the backend
// regex in chopnow-api/src/modules/auth/dto/request-otp.dto.ts — keeps
// front + back validation aligned so diaspora users with +33/+1/+44/etc.
// WhatsApp numbers can sign in without owning a local SIM.
// Built inside the component so the error message is locale-aware.
const PHONE_PATTERN = /^(?:6[5-9]\d{7}|\+[1-9]\d{6,14})$/;

type FormValues = { phone: string };

export interface OtpRequestFormProps {
  onRequested: (phone: string) => void;
}

export function OtpRequestForm({ onRequested }: OtpRequestFormProps) {
  const t = useTranslations('Auth');
  const captcha = useCaptchaConfig();
  const captchaActive = captcha.enabled && Boolean(captcha.siteKey);
  const schema = React.useMemo(
    () =>
      z.object({
        phone: z.string().regex(PHONE_PATTERN, t('phoneSchemaInvalid')),
      }),
    [t],
  );

  const {
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
    mode: 'onBlur',
  });

  const phone = watch('phone');

  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const turnstileRef = React.useRef<TurnstileInstance | null>(null);

  // Reset the held token if the backend flips the captcha state mid-
  // session (e.g. ops disables it). Without this, a stale token would
  // sit in state and confuse subsequent attempts.
  React.useEffect(() => {
    if (!captchaActive) setCaptchaToken(null);
  }, [captchaActive]);

  const onSubmit = async (values: FormValues) => {
    if (captchaActive && !captchaToken) {
      setError('root', { message: t('captchaPending') });
      return;
    }
    try {
      await auth.requestOtp(values.phone, captchaToken);
      onRequested(values.phone);
    } catch (err) {
      // Tokens are single-use — reset on failure so the next attempt
      // gets a fresh challenge instead of replaying the burned one.
      if (captchaActive) {
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      }
      setError('root', { message: (err as Error).message || t('networkError') });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <PhoneInput
        value={phone}
        onChange={(v) => setValue('phone', v, { shouldValidate: true })}
        error={errors.phone?.message}
      />

      {captchaActive ? (
        <div className="flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={captcha.siteKey as string}
            onSuccess={setCaptchaToken}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
            options={{ theme: 'light', size: 'flexible' }}
          />
        </div>
      ) : null}

      {errors.root ? (
        // role=alert auto-announces the error to screen readers when it
        // appears (e.g., "Vérification anti-bot requise" or a network
        // error from auth.requestOtp). Without it the message renders
        // silently and a non-sighted user sees no feedback.
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting || (captchaActive && !captchaToken)}
        className="w-full"
      >
        {isSubmitting ? t('sending') : t('requestOtp')}
      </Button>
    </form>
  );
}
