'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TurnstileInstance } from '@marsidev/react-turnstile';

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

const schema = z.object({
  phone: z
    .string()
    .min(9, 'Numéro à 9 chiffres requis')
    .regex(/^6[5-9]\d{7}$/, 'Numéro camerounais invalide (commence par 65–69)'),
});

type FormValues = z.infer<typeof schema>;

export interface OtpRequestFormProps {
  onRequested: (phone: string) => void;
}

export function OtpRequestForm({ onRequested }: OtpRequestFormProps) {
  const captcha = useCaptchaConfig();
  const captchaActive = captcha.enabled && Boolean(captcha.siteKey);

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
      setError('root', { message: 'Vérification anti-bot requise — patientez un instant.' });
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
      setError('root', { message: (err as Error).message || 'Erreur réseau' });
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

      {errors.root ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}

      <Button
        type="submit"
        disabled={isSubmitting || (captchaActive && !captchaToken)}
        className="w-full"
      >
        {isSubmitting ? 'Envoi…' : 'Recevoir le code'}
      </Button>
    </form>
  );
}
