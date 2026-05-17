'use client';

import * as React from 'react';
import { useForm, type Resolver, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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

const schema = z
  .object({
    name: z.string().min(2, '2 caractères minimum').max(80),
    phone: z.string().regex(PHONE, 'Numéro invalide'),
    vehicleType: z.enum(['MOTO', 'BICYCLE', 'CAR', 'ON_FOOT'], {
      errorMap: () => ({ message: 'Choisis un mode de transport' }),
    }),
    preferredZone: z.string().max(80).optional().or(z.literal('')),
    licensePlate: z
      .string()
      .regex(PLATE_VISIBLE, 'Format plaque invalide')
      .optional()
      .or(z.literal('')),
    momoPhone: z.string().regex(PHONE, 'Numéro MoMo invalide'),
  })
  .refine(
    (v) =>
      v.vehicleType === 'ON_FOOT' ||
      v.vehicleType === 'BICYCLE' ||
      (typeof v.licensePlate === 'string' && v.licensePlate.length > 0),
    { message: 'Plaque requise pour moto et voiture', path: ['licensePlate'] },
  );

type FormValues = z.input<typeof schema>;

const VEHICLES = [
  { value: 'MOTO' as const, label: '🏍️ Moto', sub: 'Plus rapide en ville' },
  { value: 'BICYCLE' as const, label: '🚲 Vélo', sub: 'Bon pour les courtes distances' },
  { value: 'CAR' as const, label: '🚗 Voiture', sub: 'Idéal pour les groupes' },
  { value: 'ON_FOOT' as const, label: '👟 À pied', sub: 'Quartier dense uniquement' },
];

/**
 * Story 1.4 — public rider onboarding, rebuilt in Hot Plate Editorial style
 * (same look as the consumer surfaces). Single-shot multipart POST to
 * /api/riders. ID card + selfie always required; vehicle photo required for
 * MOTO/CAR (license plate visible), optional for BICYCLE, skipped for ON_FOOT.
 */
export function RiderOnboardingForm() {
  const [idCardPhoto, setIdCard] = React.useState<File | null>(null);
  const [selfiePhoto, setSelfie] = React.useState<File | null>(null);
  const [vehiclePhoto, setVehicle] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

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
      setPhotoError("Photo de la pièce d'identité requise.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!selfiePhoto) {
      setPhotoError('Selfie requis pour vérifier que la pièce est bien la tienne.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (needsVehiclePhoto && !vehiclePhoto && vehicleType !== 'BICYCLE') {
      const noun = vehicleType === 'MOTO' ? 'moto' : 'voiture';
      setPhotoError(`Photo de ta ${noun} requise (plaque bien visible).`);
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

      const res = await fetch(`${API_URL}/api/riders`, { method: 'POST', body: form });
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

      <FormSection num="01" title="Qui es-tu ?">
        <Field label="Nom complet" error={errors.name?.message}>
          <BrandInput placeholder="Jean Mboué" autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Numéro WhatsApp" error={errors.phone?.message}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                value={field.value}
                onChange={field.onChange}
                error={errors.phone?.message}
              />
            )}
          />
        </Field>
      </FormSection>

      <FormSection num="02" title="Avec quoi tu livres ?">
        <fieldset className="space-y-2">
          {VEHICLES.map((v) => (
            <RadioCard
              key={v.value}
              value={v.value}
              label={v.label}
              sub={v.sub}
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
          <Field
            label="Numéro de plaque"
            hint="majuscules — espaces tolérés"
            error={errors.licensePlate?.message}
          >
            <BrandInput
              placeholder="LT 1234 X"
              autoCapitalize="characters"
              {...register('licensePlate', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
          </Field>
        ) : null}

        <Field label="Zone préférée" hint="quartier où tu veux travailler — optionnel">
          <BrandInput placeholder="Makepe, Bonamoussadi…" {...register('preferredZone')} />
        </Field>
      </FormSection>

      <FormSection num="03" title="Tes pièces">
        <PhotoPicker
          label="Recto de ta CNI / passeport"
          required
          file={idCardPhoto}
          onPick={setIdCard}
        />
        <PhotoPicker
          label="Selfie clair (visage)"
          required
          helperText="Doit clairement montrer ton visage. Pas de masque, pas de filtre."
          file={selfiePhoto}
          onPick={setSelfie}
        />
        {needsVehiclePhoto ? (
          <PhotoPicker
            label={
              vehicleType === 'MOTO'
                ? 'Photo de ta moto'
                : vehicleType === 'CAR'
                  ? 'Photo de ta voiture'
                  : 'Photo de ton vélo'
            }
            hint={vehicleType === 'BICYCLE' ? 'optionnel' : 'plaque visible'}
            required={vehicleType !== 'BICYCLE'}
            file={vehiclePhoto}
            onPick={setVehicle}
          />
        ) : null}
      </FormSection>

      <FormSection num="04" title="Pour être payé">
        <Field
          label="Numéro MTN MoMo / Orange Money"
          hint="paie quotidienne à 21h00"
          error={errors.momoPhone?.message}
        >
          <Controller
            control={control}
            name="momoPhone"
            render={({ field }) => (
              <PhoneInput
                value={field.value}
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
          {submitting ? 'Envoi…' : 'Envoyer mon dossier'}
        </Button>
        <p className="mt-3 text-center text-[11px] font-medium text-chop-ink-secondary">
          En soumettant, tu acceptes les conditions livreur TChopNow.
        </p>
      </div>
    </form>
  );
}

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
