'use client';

import * as React from 'react';
import { useForm, type Resolver, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/PhoneInput';
import { ApiClientError } from '@/lib/api/api-client';
import {
  BrandInput,
  ErrorBanner,
  Field,
  FormSection,
  PhotoPicker,
  RadioCard,
} from '@/components/forms/onboarding-atoms';
import { SuccessState } from '@/features/vendor-onboarding/components/VendorOnboardingForm';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;
// Cameroon plates can carry spaces ("LT 1234 AB"). The old `[A-Z0-9-]{4,12}`
// rejected legitimate plates. We accept spaces in the visible value and
// strip them before submitting so the backend stores a normalized form.
const PLATE_VISIBLE = /^[A-Z0-9 -]{4,15}$/;

// Schema built inside the component so error messages are locale-aware.
type FormValues = {
  name: string;
  phone: string;
  vehicleType: 'MOTO' | 'BICYCLE' | 'CAR' | 'ON_FOOT';
  preferredZone?: string;
  licensePlate?: string;
  momoPhone: string;
};

type VehicleKey = 'vehicleMoto' | 'vehicleBike' | 'vehicleCar' | 'vehicleOnFoot';
const VEHICLES: Array<{
  value: 'MOTO' | 'BICYCLE' | 'CAR' | 'ON_FOOT';
  labelKey: VehicleKey;
  subKey: `${VehicleKey}Sub`;
}> = [
  { value: 'MOTO', labelKey: 'vehicleMoto', subKey: 'vehicleMotoSub' },
  { value: 'BICYCLE', labelKey: 'vehicleBike', subKey: 'vehicleBikeSub' },
  { value: 'CAR', labelKey: 'vehicleCar', subKey: 'vehicleCarSub' },
  { value: 'ON_FOOT', labelKey: 'vehicleOnFoot', subKey: 'vehicleOnFootSub' },
];

/**
 * Story 1.4 — public rider onboarding, rebuilt in Hot Plate Editorial style
 * (same look as the consumer surfaces). Single-shot multipart POST to
 * /api/riders. ID card + selfie always required; vehicle photo required for
 * MOTO/CAR (license plate visible), optional for BICYCLE, skipped for ON_FOOT.
 */
export function RiderOnboardingForm() {
  const t = useTranslations('RiderOnboarding');
  const [idCardPhoto, setIdCard] = React.useState<File | null>(null);
  const [selfiePhoto, setSelfie] = React.useState<File | null>(null);
  const [vehiclePhoto, setVehicle] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, t('validationMin2')).max(80),
          phone: z.string().regex(PHONE, t('validationPhone')),
          vehicleType: z.enum(['MOTO', 'BICYCLE', 'CAR', 'ON_FOOT'], {
            errorMap: () => ({ message: t('validationVehicle') }),
          }),
          preferredZone: z.string().max(80).optional().or(z.literal('')),
          licensePlate: z
            .string()
            .regex(PLATE_VISIBLE, t('validationPlate'))
            .optional()
            .or(z.literal('')),
          momoPhone: z.string().regex(PHONE, t('validationMomo')),
        })
        .refine(
          (v) =>
            v.vehicleType === 'ON_FOOT' ||
            v.vehicleType === 'BICYCLE' ||
            (typeof v.licensePlate === 'string' && v.licensePlate.length > 0),
          { message: t('validationPlateRequired'), path: ['licensePlate'] },
        ),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { vehicleType: 'MOTO' },
  });

  const vehicleType = watch('vehicleType');
  const needsVehiclePhoto = vehicleType !== 'ON_FOOT';
  const needsLicensePlate = vehicleType === 'MOTO' || vehicleType === 'CAR';

  if (done) return <SuccessState role="rider" />;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setPhotoError(null);
    if (!idCardPhoto) {
      setPhotoError(t('errIdRequired'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!selfiePhoto) {
      setPhotoError(t('errSelfieRequired'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (needsVehiclePhoto && !vehiclePhoto && vehicleType !== 'BICYCLE') {
      setPhotoError(vehicleType === 'MOTO' ? t('errMotoPhotoRequired') : t('errCarPhotoRequired'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Normalize plate before sending: strip spaces + uppercase.
    const normalizedPlate = values.licensePlate
      ? values.licensePlate.replace(/\s+/g, '').toUpperCase()
      : '';

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', values.name);
      form.append('phone', values.phone);
      form.append('vehicleType', values.vehicleType);
      if (values.preferredZone) form.append('preferredZone', values.preferredZone);
      if (normalizedPlate) form.append('licensePlate', normalizedPlate);
      form.append('momoPhone', values.momoPhone);
      form.append('idCardPhoto', idCardPhoto);
      form.append('selfiePhoto', selfiePhoto);
      if (vehiclePhoto) form.append('vehiclePhoto', vehiclePhoto);

      const res = await fetch(`${API_URL}/api/v1/riders`, { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiClientError(res.status, body);
      }
      setDone(true);
    } catch (err) {
      setServerError(extractMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {photoError ? <ErrorBanner message={photoError} /> : null}

      <FormSection num="01" title={t('section1')}>
        <Field label={t('nameLabel')} error={errors.name?.message}>
          <BrandInput
            placeholder={t('namePlaceholder')}
            autoComplete="name"
            {...register('name')}
          />
        </Field>
        <Field label={t('whatsappLabel')} error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
        </Field>
      </FormSection>

      <FormSection num="02" title={t('section2')}>
        <fieldset className="space-y-2">
          {VEHICLES.map((v) => (
            <RadioCard
              key={v.value}
              value={v.value}
              label={t(v.labelKey)}
              sub={t(v.subKey)}
              {...register('vehicleType')}
            />
          ))}
          {errors.vehicleType ? (
            <p className="mt-1 text-xs font-medium text-chop-danger">
              {errors.vehicleType.message}
            </p>
          ) : null}
        </fieldset>

        {needsLicensePlate ? (
          <Field label={t('plateLabel')} hint={t('plateHint')} error={errors.licensePlate?.message}>
            <BrandInput
              placeholder={t('platePlaceholder')}
              autoCapitalize="characters"
              {...register('licensePlate', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
          </Field>
        ) : null}

        <Field label={t('zoneLabel')} hint={t('zoneHint')}>
          <BrandInput placeholder={t('zonePlaceholder')} {...register('preferredZone')} />
        </Field>
      </FormSection>

      <FormSection num="03" title={t('section3')}>
        <PhotoPicker label={t('idLabel')} required file={idCardPhoto} onPick={setIdCard} />
        <PhotoPicker
          label={t('selfieLabel')}
          required
          helperText={t('selfieHelper')}
          file={selfiePhoto}
          onPick={setSelfie}
        />
        {needsVehiclePhoto ? (
          <PhotoPicker
            label={
              vehicleType === 'MOTO'
                ? t('motoPhotoLabel')
                : vehicleType === 'CAR'
                  ? t('carPhotoLabel')
                  : t('bikePhotoLabel')
            }
            hint={
              vehicleType === 'BICYCLE' ? t('vehiclePhotoHintOptional') : t('vehiclePhotoHintPlate')
            }
            required={vehicleType !== 'BICYCLE'}
            file={vehiclePhoto}
            onPick={setVehicle}
          />
        ) : null}
      </FormSection>

      <FormSection num="04" title={t('section4')}>
        <Field label={t('momoLabel')} hint={t('momoHint')} error={errors.momoPhone?.message}>
          <Controller
            control={control}
            name="momoPhone"
            render={({ field }) => (
              <PhoneInput
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.momoPhone?.message}
              />
            )}
          />
        </Field>
      </FormSection>

      {serverError ? <ErrorBanner message={serverError} /> : null}

      <div className="pt-2">
        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? t('submitting') : t('submit')}
        </Button>
        <p className="mt-3 text-center text-[11px] font-medium text-chop-ink-secondary">
          {t('termsConsent')}
        </p>
      </div>
    </form>
  );
}

// Note: extractMessage returns code-specific FR strings as last-resort fallback.
// The component-level translation hook can't be called outside React, so error
// codes are mapped to FR strings here and the caller's `t` would re-translate
// if needed — but in practice the codes below map 1:1 to dictionary keys.
function extractMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    if (body?.code === 'rider_already_submitted') {
      return 'Ce numéro a déjà un dossier en cours. Patiente la validation ou contacte le support.';
    }
    if (body?.code === 'phone_used_by_other_role') {
      return 'Ce numéro est déjà utilisé. Utilise un autre numéro WhatsApp.';
    }
    if (body?.code === 'license_plate_already_used') {
      return 'Cette plaque est déjà enregistrée par un autre livreur.';
    }
    if (err.status === 429) {
      return 'Trop de tentatives — réessaye dans une heure.';
    }
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? 'Erreur réseau';
}
