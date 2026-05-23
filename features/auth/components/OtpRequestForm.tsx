'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';

import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/PhoneInput';
import { auth } from '@/lib/auth';

/**
 * Canonical example of the form pattern devs should copy for Sprint 1 stories:
 *   - zod schema beside the component
 *   - react-hook-form + zodResolver for validation
 *   - typed onSubmit
 *   - server errors surfaced via setError('root', ...)
 *   - disabled state during submission
 *
 * Cloudflare Turnstile (bot-protection) is gated behind
 * NEXT_PUBLIC_CAPTCHA_ENABLED. When disabled (default), the widget never
 * renders and no token is sent — matches the backend's inert default.
 * Flip both flags + populate keys when an abuse signal appears.
 */

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

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

  // Turnstile state. When the widget isn't enabled or hasn't rendered
  // yet, captchaToken stays null and the submit button accepts that
  // (backend will short-circuit because CAPTCHA_ENABLED=false there too).
  const [captchaToken, setCaptchaToken] = React.useState<string | null>(null);
  const turnstileRef = React.useRef<TurnstileInstance | null>(null);

  const onSubmit = async (values: FormValues) => {
    if (CAPTCHA_ENABLED && !captchaToken) {
      setError('root', { message: 'Vérification anti-bot requise — patientez un instant.' });
      return;
    }
    try {
      await auth.requestOtp(values.phone, captchaToken);
      onRequested(values.phone);
    } catch (err) {
      // Tokens are single-use — reset on failure so the next attempt
      // gets a fresh challenge instead of replaying the burned one.
      if (CAPTCHA_ENABLED) {
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

      {CAPTCHA_ENABLED && TURNSTILE_SITE_KEY ? (
        <div className="flex justify-center">
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
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
        disabled={isSubmitting || (CAPTCHA_ENABLED && !captchaToken)}
        className="w-full"
      >
        {isSubmitting ? 'Envoi…' : 'Recevoir le code'}
      </Button>
    </form>
  );
}
