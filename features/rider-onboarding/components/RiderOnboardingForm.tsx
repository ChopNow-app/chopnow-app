'use client';

import * as React from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;
const PLATE = /^[A-Z0-9-]{4,12}$/;

const schema = z
  .object({
    name: z.string().min(2, '2 caractères minimum').max(80),
    phone: z.string().regex(PHONE, 'Numéro invalide'),
    vehicleType: z.enum(['MOTO', 'BICYCLE', 'CAR', 'ON_FOOT'], {
      errorMap: () => ({ message: 'Choisis un mode de transport' }),
    }),
    preferredZone: z.string().max(80).optional().or(z.literal('')),
    licensePlate: z.string().regex(PLATE, 'Format plaque invalide').optional().or(z.literal('')),
    momoPhone: z.string().regex(PHONE, 'Numéro MoMo invalide'),
  })
  .refine(
    (v) =>
      v.vehicleType === 'ON_FOOT' ||
      v.vehicleType === 'BICYCLE' ||
      (typeof v.licensePlate === 'string' && v.licensePlate.length > 0),
    {
      message: 'Plaque requise pour moto et voiture',
      path: ['licensePlate'],
    },
  );

type FormValues = z.input<typeof schema>;

const VEHICLES = [
  { value: 'MOTO', label: '🏍️ Moto' },
  { value: 'BICYCLE', label: '🚲 Vélo' },
  { value: 'CAR', label: '🚗 Voiture' },
  { value: 'ON_FOOT', label: '👟 À pied' },
] as const;

/**
 * Story 1.4 — public rider onboarding. Same shape as /vendre: single-shot
 * multipart POST to /api/riders. Photos (idCard + selfie + optional vehicle)
 * are required for non-on-foot vehicles. Admin reviews within 4h per the
 * confirmation WhatsApp the backend sends after submit.
 */
export function RiderOnboardingForm() {
  const [idCardPhoto, setIdCard] = React.useState<File | null>(null);
  const [selfiePhoto, setSelfie] = React.useState<File | null>(null);
  const [vehiclePhoto, setVehicle] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
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

  if (done) {
    return (
      <div className="bg-card rounded-lg border p-6 text-center">
        <h2 className="text-xl font-bold">✅ Dossier reçu</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          On vérifie tes pièces sous 4 heures. Tu recevras une notification WhatsApp à
          l&apos;activation.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    if (!idCardPhoto) {
      setServerError("Photo de la pièce d'identité requise");
      return;
    }
    if (!selfiePhoto) {
      setServerError('Selfie requis');
      return;
    }
    if (needsVehiclePhoto && !vehiclePhoto) {
      setServerError(
        `Photo de ta ${vehicleType === 'MOTO' ? 'moto' : vehicleType === 'CAR' ? 'voiture' : 'vélo'} requise`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', values.name);
      form.append('phone', values.phone);
      form.append('vehicleType', values.vehicleType);
      if (values.preferredZone) form.append('preferredZone', values.preferredZone);
      if (values.licensePlate) form.append('licensePlate', values.licensePlate);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Section title="1 · Qui es-tu ?">
        <Field label="Nom complet" error={errors.name?.message}>
          <Input placeholder="Jean Mboué" {...register('name')} />
        </Field>
        <Field label="Numéro WhatsApp" error={errors.phone?.message}>
          <Input type="tel" inputMode="tel" placeholder="670000000" {...register('phone')} />
        </Field>
      </Section>

      <Section title="2 · Avec quoi tu livres ?">
        <fieldset className="space-y-2">
          {VEHICLES.map((v) => (
            <label
              key={v.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3"
            >
              <input type="radio" value={v.value} {...register('vehicleType')} />
              <span>{v.label}</span>
            </label>
          ))}
          {errors.vehicleType ? (
            <p className="text-xs text-destructive">{errors.vehicleType.message}</p>
          ) : null}
        </fieldset>

        {needsLicensePlate ? (
          <Field label="Numéro de plaque" error={errors.licensePlate?.message}>
            <Input
              placeholder="LT1234"
              autoCapitalize="characters"
              {...register('licensePlate', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
            />
          </Field>
        ) : null}

        <Field label="Zone préférée" hint="(quartier où tu veux travailler — optionnel)">
          <Input placeholder="Makepe, Bonanjo…" {...register('preferredZone')} />
        </Field>
      </Section>

      <Section title="3 · Tes pièces">
        <PhotoPicker
          label="Photo recto de ta CNI / passeport"
          file={idCardPhoto}
          onPick={setIdCard}
          required
        />
        <PhotoPicker label="Selfie clair (visage)" file={selfiePhoto} onPick={setSelfie} required />
        {needsVehiclePhoto ? (
          <PhotoPicker
            label={`Photo de ta ${vehicleType === 'MOTO' ? 'moto' : vehicleType === 'CAR' ? 'voiture' : 'vélo'} ${vehicleType === 'BICYCLE' ? '(optionnel)' : '(plaque visible)'}`}
            file={vehiclePhoto}
            onPick={setVehicle}
            required={vehicleType !== 'BICYCLE'}
          />
        ) : null}
      </Section>

      <Section title="4 · Pour être payé">
        <Field label="Numéro MTN MoMo / Orange Money" error={errors.momoPhone?.message}>
          <Input type="tel" inputMode="tel" placeholder="670000000" {...register('momoPhone')} />
        </Field>
      </Section>

      {serverError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Envoi…' : 'Envoyer mon dossier'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        En soumettant, tu acceptes les conditions livreur ChopNow.
      </p>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">
        {label}
        {hint ? <span className="ml-1 text-xs text-muted-foreground">{hint}</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function PhotoPicker({
  label,
  file,
  onPick,
  required,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  required?: boolean;
}) {
  const inputId = React.useId();
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-semibold">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed bg-background p-4 text-sm"
      >
        {file ? `📸 ${file.name}` : '📸 Prendre / choisir une photo'}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="hidden"
      />
      {file ? (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="mt-1 text-xs text-muted-foreground underline"
        >
          Retirer
        </button>
      ) : null}
    </div>
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
