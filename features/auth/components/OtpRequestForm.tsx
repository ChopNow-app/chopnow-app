'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

  const onSubmit = async (values: FormValues) => {
    try {
      await auth.requestOtp(values.phone);
      onRequested(values.phone);
    } catch (err) {
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
      {errors.root ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Envoi…' : 'Recevoir le code'}
      </Button>
    </form>
  );
}
