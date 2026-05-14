'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiClientError } from '@/lib/api/api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;

const schema = z.object({
  name: z.string().min(2, '2 caractères minimum').max(80),
  quartier: z.string().min(2, 'Quartier requis').max(80),
  pointOfReference: z.string().max(200).optional().or(z.literal('')),
  whatsappPhone: z.string().regex(PHONE, 'Numéro WhatsApp invalide'),
  momoPhone: z.string().regex(PHONE, 'Numéro MoMo invalide'),
  declaredCapacity: z.enum(['LT_10', 'R_10_30', 'GT_30'], {
    errorMap: () => ({ message: 'Choisis une capacité' }),
  }),
  firstItemName: z.string().min(2, '2 caractères minimum').max(80),
  firstItemPriceXAF: z.coerce.number().int().min(100, 'Minimum 100 FCFA').max(1_000_000),
});

type FormValues = z.input<typeof schema>;

const CAPACITY_OPTIONS = [
  { value: 'LT_10', label: '< 10 plats / jour' },
  { value: 'R_10_30', label: '10 à 30 plats / jour' },
  { value: 'GT_30', label: '> 30 plats / jour' },
] as const;

/**
 * Story 2.0 — public onboarding form for informal vendors. The "share link"
 * route is `tchopnow.app/vendre`. Single-shot multipart submission per the
 * backend contract — text fields + two optional photos in one POST. No auth
 * required; the response includes a placeholder Vendor row with status =
 * PENDING_REVIEW and an admin reviews it within 24h.
 */
export function VendorOnboardingForm() {
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null);
  const [firstItemPhoto, setFirstItemPhoto] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstItemPriceXAF: 1500 },
  });

  if (done) {
    return (
      <div className="bg-card rounded-lg border p-6 text-center">
        <h2 className="text-xl font-bold">✅ Demande reçue</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Nous validons ton inscription sous 24h. Tu recevras une notification WhatsApp dès
          l&apos;activation.
        </p>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', values.name);
      form.append('quartier', values.quartier);
      if (values.pointOfReference) form.append('pointOfReference', values.pointOfReference);
      form.append('whatsappPhone', values.whatsappPhone);
      form.append('momoPhone', values.momoPhone);
      form.append('declaredCapacity', values.declaredCapacity);
      form.append('firstItemName', values.firstItemName);
      form.append('firstItemPriceXAF', String(values.firstItemPriceXAF));
      if (profilePhoto) form.append('profilePhoto', profilePhoto);
      if (firstItemPhoto) form.append('firstItemPhoto', firstItemPhoto);

      const res = await fetch(`${API_URL}/api/vendors`, { method: 'POST', body: form });
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
      <Section title="1 · Ta cuisine">
        <Field label="Nom de la cuisine" error={errors.name?.message}>
          <Input placeholder="Chez Maman Mboué" {...register('name')} />
        </Field>
        <Field label="Quartier de Douala" error={errors.quartier?.message}>
          <Input placeholder="Makepe, Bonamoussadi…" {...register('quartier')} />
        </Field>
        <Field
          label="Point de repère"
          hint="(optionnel — en face de la pharmacie X, derrière le carrefour Y…)"
        >
          <Input
            placeholder="En face de la pharmacie Ste-Marie"
            {...register('pointOfReference')}
          />
        </Field>
        <PhotoPicker
          label="Photo de profil / devanture"
          file={profilePhoto}
          onPick={setProfilePhoto}
        />
      </Section>

      <Section title="2 · Comment te joindre">
        <Field label="Numéro WhatsApp" error={errors.whatsappPhone?.message}>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="670000000"
            {...register('whatsappPhone')}
          />
        </Field>
        <Field
          label="Numéro MTN MoMo / Orange Money (pour recevoir les paiements)"
          error={errors.momoPhone?.message}
        >
          <Input type="tel" inputMode="tel" placeholder="670000000" {...register('momoPhone')} />
        </Field>
      </Section>

      <Section title="3 · Combien tu prépares par jour ?">
        <fieldset className="space-y-2">
          {CAPACITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3"
            >
              <input type="radio" value={opt.value} {...register('declaredCapacity')} />
              <span>{opt.label}</span>
            </label>
          ))}
          {errors.declaredCapacity ? (
            <p className="text-xs text-destructive">{errors.declaredCapacity.message}</p>
          ) : null}
        </fieldset>
      </Section>

      <Section title="4 · Ton plat phare">
        <Field label="Nom du plat" error={errors.firstItemName?.message}>
          <Input placeholder="Poulet DG, Ndolè…" {...register('firstItemName')} />
        </Field>
        <Field label="Prix (FCFA)" error={errors.firstItemPriceXAF?.message}>
          <Input
            type="number"
            inputMode="numeric"
            min={100}
            step={100}
            placeholder="3000"
            {...register('firstItemPriceXAF')}
          />
        </Field>
        <PhotoPicker
          label="Photo du plat (très conseillé — les plats avec photo se vendent mieux)"
          file={firstItemPhoto}
          onPick={setFirstItemPhoto}
        />
      </Section>

      {serverError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full" size="lg">
        {submitting ? 'Envoi…' : 'Envoyer ma demande'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        En soumettant, tu acceptes la commission ChopNow et les conditions d&apos;utilisation.
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
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const inputId = React.useId();
  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed bg-background p-4 text-sm"
      >
        {file ? `📸 ${file.name}` : '📸 Choisir une photo'}
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
    if (body?.code === 'vendor_already_submitted') {
      return 'Ce numéro a déjà une demande en cours. Patiente la validation ou contacte le support.';
    }
    if (body?.code === 'phone_used_by_other_role') {
      return 'Ce numéro est déjà utilisé par un client. Utilise un autre numéro WhatsApp.';
    }
    if (err.status === 429) {
      return 'Trop de tentatives — réessaye dans une heure.';
    }
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? 'Erreur réseau';
}
