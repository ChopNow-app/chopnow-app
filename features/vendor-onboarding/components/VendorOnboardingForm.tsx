'use client';

// React 19's react-hooks/set-state-in-effect bites the blob-URL preview
// pattern in PhotoPicker. Same precedent as features/consumer/hooks/useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/PhoneInput';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { ApiClientError } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';

// Leaflet touches `window` on mount → must be SSR-disabled. Loading="..."
// keeps the layout space reserved so the form doesn't reflow when the map
// finishes loading.
const VendorLocationMap = dynamic(() => import('./VendorLocationMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex animate-pulse items-center justify-center rounded-2xl border-2 border-divider bg-chop-surface-gray text-sm font-medium text-chop-ink-secondary"
      style={{ height: 280 }}
    >
      Chargement de la carte…
    </div>
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// 9-digit Cameroon local (PhoneInput strips to digits) OR E.164. The backend
// re-validates with the same pattern.
const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB — mirrors backend limit

const schema = z.object({
  name: z.string().min(2, '2 caractères minimum').max(80),
  ownerName: z.string().min(2, '2 caractères minimum').max(80),
  type: z.enum(['INFORMAL', 'SEMI_FORMAL', 'RESTAURANT'], {
    errorMap: () => ({ message: 'Choisis le type' }),
  }),
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
  { value: 'LT_10' as const, label: '< 10 plats / jour', sub: 'Tu cuisines à la maison' },
  { value: 'R_10_30' as const, label: '10 à 30 plats / jour', sub: 'Petite cuisine, maquis' },
  { value: 'GT_30' as const, label: '> 30 plats / jour', sub: 'Restaurant établi' },
];

const TYPE_OPTIONS = [
  {
    value: 'INFORMAL' as const,
    label: '🍲 Cuisine maison',
    sub: 'Tu cuisines chez toi, sans local commercial',
  },
  {
    value: 'SEMI_FORMAL' as const,
    label: '🍽️ Maquis',
    sub: 'Petit restaurant de quartier, terrasse, snack',
  },
  {
    value: 'RESTAURANT' as const,
    label: '🏛️ Restaurant',
    sub: 'Restaurant déclaré (RCCM), enseigne fixe',
  },
];

// Standard browser geolocation reading. Returns the coords or null when
// the user denies / GPS is unavailable. We don't ask for high accuracy —
// the catalogue ranking is at the km level, ±50m is fine.
interface Coords {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}
async function getCoords(): Promise<Coords | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

/**
 * Story 2.0 — public onboarding form for informal vendors, rebuilt in the
 * Hot Plate Editorial aesthetic (Phase 2 redesign carryover). Single-shot
 * multipart submission per the backend contract: text fields + two photos
 * in one POST. No auth required; the response includes a Vendor row with
 * status = PENDING_REVIEW and an admin reviews within 24h.
 *
 * Photo handling: profilePhoto is now required client-side because the
 * /restaurants catalogue card relies on it for the hero image (the
 * deterministic gradient + emoji fallback is a graceful-degrade only).
 * firstItemPhoto stays optional but is strongly encouraged.
 */
export function VendorOnboardingForm() {
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null);
  const [firstItemPhoto, setFirstItemPhoto] = React.useState<File | null>(null);
  const [coords, setCoords] = React.useState<Coords | null>(null);
  const [gpsState, setGpsState] = React.useState<'idle' | 'requesting' | 'denied'>('idle');
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstItemPriceXAF: 1500, type: 'INFORMAL' },
  });

  const onCaptureGps = async () => {
    setGpsState('requesting');
    const c = await getCoords();
    if (c) {
      setCoords(c);
      setGpsState('idle');
    } else {
      setGpsState('denied');
    }
  };

  if (done) return <SuccessState role="vendor" />;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setPhotoError(null);
    if (!profilePhoto) {
      setPhotoError('La photo de devanture est obligatoire — sans elle ta cuisine est invisible.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', values.name);
      form.append('ownerName', values.ownerName);
      form.append('type', values.type);
      form.append('quartier', values.quartier);
      if (values.pointOfReference) form.append('pointOfReference', values.pointOfReference);
      form.append('whatsappPhone', values.whatsappPhone);
      form.append('momoPhone', values.momoPhone);
      form.append('declaredCapacity', values.declaredCapacity);
      form.append('firstItemName', values.firstItemName);
      form.append('firstItemPriceXAF', String(values.firstItemPriceXAF));
      if (coords) {
        form.append('latitude', String(coords.latitude));
        form.append('longitude', String(coords.longitude));
      }
      form.append('profilePhoto', profilePhoto);
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {photoError ? <ErrorBanner message={photoError} /> : null}

      <FormSection num="01" title="Ta cuisine">
        <Field label="Nom de la cuisine" error={errors.name?.message}>
          <BrandInput placeholder="Chez Maman Mboué" {...register('name')} />
        </Field>
        <Field label="Ton nom (gérant)" error={errors.ownerName?.message}>
          <BrandInput placeholder="Marie Mboué" autoComplete="name" {...register('ownerName')} />
        </Field>
        <Field label="Type de cuisine">
          <fieldset className="space-y-2">
            {TYPE_OPTIONS.map((opt) => (
              <RadioCard
                key={opt.value}
                value={opt.value}
                label={opt.label}
                sub={opt.sub}
                {...register('type')}
              />
            ))}
            {errors.type ? (
              <p className="mt-1 text-xs font-medium text-chop-danger">{errors.type.message}</p>
            ) : null}
          </fieldset>
        </Field>
        <Field label="Quartier de Douala" error={errors.quartier?.message}>
          <BrandInput placeholder="Makepe, Bonamoussadi…" {...register('quartier')} />
        </Field>
        <Field
          label="Point de repère"
          hint="optionnel — en face de la pharmacie X, derrière le carrefour Y…"
        >
          <BrandInput
            placeholder="En face de la pharmacie Ste-Marie"
            {...register('pointOfReference')}
          />
        </Field>

        {/* GPS capture — vendor's actual location pin. Without this every
            onboarded vendor lands at Douala center and the distance ranking
            is broken for them. Optional — backend falls back to city center. */}
        <Field
          label="Position GPS"
          hint="indispensable pour que les clients à proximité te trouvent"
        >
          {coords ? (
            <div className="space-y-2">
              <VendorLocationMap
                lat={coords.latitude}
                lng={coords.longitude}
                onChange={({ latitude, longitude }) =>
                  setCoords({ latitude, longitude, accuracyMeters: coords.accuracyMeters })
                }
              />
              <div className="flex items-center justify-between rounded-xl bg-chop-mboue-light/50 px-3 py-2 text-[12px]">
                <span className="font-mono text-[11px] text-chop-ink-secondary">
                  📍 {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoords(null);
                    setGpsState('idle');
                  }}
                  className="text-[12px] font-semibold text-chop-ink-secondary underline-offset-2 hover:underline"
                >
                  Refaire la capture
                </button>
              </div>
              <p className="text-[12px] font-medium text-chop-ink-secondary">
                Glisse l&apos;épingle pour affiner — ou touche directement la carte au bon endroit.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCaptureGps}
              disabled={gpsState === 'requesting'}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-divider bg-chop-warm py-4 text-[14px] font-semibold text-chop-ink transition-colors hover:border-chop-red/50 hover:bg-chop-red-light/30 disabled:opacity-60"
            >
              <span aria-hidden>📍</span>
              {gpsState === 'requesting' ? 'Capture en cours…' : 'Capturer ma position'}
            </button>
          )}
          {gpsState === 'denied' ? (
            <p className="mt-1 text-[12px] font-medium text-chop-danger">
              Localisation refusée. Tu peux soumettre sans, mais ton restaurant sera placé au centre
              de Douala par défaut.
            </p>
          ) : null}
        </Field>

        <PhotoPicker
          label="Photo de devanture / cuisine"
          required
          helperText="Indispensable. Sans photo, ton restaurant n'apparaît pas dans le feed."
          file={profilePhoto}
          onPick={setProfilePhoto}
        />
      </FormSection>

      <FormSection num="02" title="Comment te joindre">
        <Field label="Numéro WhatsApp" error={errors.whatsappPhone?.message}>
          <Controller
            control={control}
            name="whatsappPhone"
            render={({ field }) => (
              <PhoneInput
                value={field.value}
                onChange={field.onChange}
                error={errors.whatsappPhone?.message}
              />
            )}
          />
        </Field>
        <Field
          label="Numéro MTN MoMo / Orange Money"
          hint="pour recevoir tes paiements"
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

      <FormSection num="03" title="Combien tu prépares par jour ?">
        <fieldset className="space-y-2">
          {CAPACITY_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              value={opt.value}
              label={opt.label}
              sub={opt.sub}
              {...register('declaredCapacity')}
            />
          ))}
          {errors.declaredCapacity ? (
            <p className="mt-1 text-xs font-medium text-chop-danger">
              {errors.declaredCapacity.message}
            </p>
          ) : null}
        </fieldset>
      </FormSection>

      <FormSection num="04" title="Ton plat phare">
        <Field label="Nom du plat" error={errors.firstItemName?.message}>
          <BrandInput placeholder="Poulet DG, Ndolè…" {...register('firstItemName')} />
        </Field>
        <Field label="Prix (FCFA)" error={errors.firstItemPriceXAF?.message}>
          <BrandInput
            type="number"
            inputMode="numeric"
            min={100}
            step={100}
            placeholder="3000"
            {...register('firstItemPriceXAF')}
          />
        </Field>
        <PhotoPicker
          label="Photo du plat"
          helperText="Très conseillé — les plats avec photo se vendent 3x mieux."
          file={firstItemPhoto}
          onPick={setFirstItemPhoto}
        />
      </FormSection>

      {serverError ? <ErrorBanner message={serverError} /> : null}

      <div className="pt-2">
        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? 'Envoi…' : 'Envoyer ma demande'}
        </Button>
        <p className="mt-3 text-center text-[11px] font-medium text-chop-ink-secondary">
          En soumettant, tu acceptes la commission TChopNow et les conditions d&apos;utilisation.
        </p>
      </div>
    </form>
  );
}

// ─── Shared form atoms (used by both vendor + rider forms) ──────────────

export function FormSection({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
      <header className="mb-5">
        <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-chop-red">
          {num}.
        </span>
        <h2 className="mt-0.5 text-[20px] font-extrabold tracking-tight text-chop-ink md:text-[22px]">
          {title}
        </h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({
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
      <label className="mb-1.5 block text-[13px] font-bold text-chop-ink">
        {label}
        {hint ? <span className="ml-1.5 font-medium text-chop-ink-secondary">· {hint}</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-chop-danger">{error}</p> : null}
    </div>
  );
}

export const BrandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <Input
    ref={ref}
    className={cn(
      'h-11 rounded-xl border-divider bg-chop-warm text-[15px] focus-visible:border-chop-red focus-visible:ring-2 focus-visible:ring-chop-red/20',
      className,
    )}
    {...props}
  />
));
BrandInput.displayName = 'BrandInput';

export const RadioCard = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; sub?: string }
>(({ label, sub, ...props }, ref) => (
  <label className="group block cursor-pointer">
    <input ref={ref} type="radio" className="peer sr-only" {...props} />
    <div className="flex items-start gap-3 rounded-xl border-2 border-divider bg-chop-warm p-3.5 transition-all peer-checked:border-chop-red peer-checked:bg-chop-red-light peer-checked:shadow-card">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-divider transition-all peer-checked:border-chop-red">
        <span
          aria-hidden
          className="hidden h-2.5 w-2.5 rounded-full bg-chop-red group-[:has(:checked)]:block peer-checked:block"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-chop-ink">{label}</p>
        {sub ? (
          <p className="mt-0.5 text-[12px] font-medium text-chop-ink-secondary">{sub}</p>
        ) : null}
      </div>
    </div>
  </label>
));
RadioCard.displayName = 'RadioCard';

export function PhotoPicker({
  label,
  hint,
  helperText,
  file,
  onPick,
  required,
}: {
  label: string;
  hint?: string;
  helperText?: string;
  file: File | null;
  onPick: (f: File | null) => void;
  required?: boolean;
}) {
  const inputId = React.useId();
  const [preview, setPreview] = React.useState<string | null>(null);

  // Generate (and revoke) a blob URL for the live preview thumbnail. This
  // makes the "did my photo upload?" feedback immediate — the old UI showed
  // only the filename, which made the picker feel like a placeholder.
  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onSelect = (next: File | null) => {
    if (next && next.size > MAX_PHOTO_BYTES) {
      onPick(null);
      window.alert(`Photo trop lourde (${(next.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`);
      return;
    }
    onPick(next);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-bold text-chop-ink">
        {label}
        {required ? <span className="ml-1 text-chop-red">*</span> : null}
        {hint ? <span className="ml-1.5 font-medium text-chop-ink-secondary">· {hint}</span> : null}
      </label>

      {file && preview ? (
        // Live preview with file metadata + remove action — makes upload
        // feel concrete, not placeholder-y.
        <div className="relative overflow-hidden rounded-2xl border-2 border-chop-mboue/40 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/50 to-transparent px-3 py-2.5 text-[12px] font-medium text-white">
            <span className="flex min-w-0 items-center gap-1.5">
              <span aria-hidden>✓</span>
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 opacity-70">· {(file.size / 1024).toFixed(0)} KB</span>
            </span>
            <button
              type="button"
              onClick={() => onPick(null)}
              className="shrink-0 text-white underline-offset-2 hover:underline"
            >
              Changer
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-divider bg-chop-warm py-7 text-center transition-colors hover:border-chop-red/50 hover:bg-chop-red-light/30"
        >
          <span aria-hidden className="text-3xl">
            📸
          </span>
          <span className="text-[14px] font-semibold text-chop-ink">Touche pour photographier</span>
          <span className="text-[11px] font-medium text-chop-ink-secondary">
            JPG, PNG, HEIC · max 8 MB
          </span>
        </label>
      )}

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {helperText ? (
        <p className="mt-1.5 text-[12px] font-medium text-chop-ink-secondary">{helperText}</p>
      ) : null}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-l-4 border-chop-danger bg-chop-danger-light px-4 py-3 text-[13px] font-medium text-chop-danger">
      {message}
    </div>
  );
}

// ─── Shared success state ────────────────────────────────────────────────

export function SuccessState({ role }: { role: 'vendor' | 'rider' }) {
  const config =
    role === 'vendor'
      ? {
          title: 'Demande reçue.',
          sub: 'On vérifie ton profil et tes photos. Réponse sur WhatsApp sous 24h.',
          steps: [
            [
              'Vérification de tes photos',
              'Le validator confirme que le nom + numéro + plat correspondent.',
            ],
            ['Notification WhatsApp', 'Tu reçois un message du numéro officiel TChopNow.'],
            [
              'Ouverture du dashboard',
              'Tu te connectes avec ton numéro WhatsApp et tu commences à recevoir des commandes.',
            ],
          ],
        }
      : {
          title: 'Dossier reçu.',
          sub: 'On vérifie tes pièces. Réponse sur WhatsApp sous 4 heures.',
          steps: [
            [
              'Vérification CNI + selfie',
              'Le validator confirme que ton ID est lisible et correspond à ta photo.',
            ],
            ['Notification WhatsApp', 'Tu reçois un message du numéro officiel TChopNow.'],
            ['Activation', 'Tu te connectes, tu passes en ligne et tu reçois ta première course.'],
          ],
        };
  return (
    <div className="relative overflow-hidden rounded-3xl bg-chop-card-white p-7 shadow-elevated md:p-10">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-chop-mboue-light">
        <span aria-hidden className="text-2xl">
          ✓
        </span>
      </div>
      <h2 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight text-chop-ink md:text-[32px]">
        {config.title}
      </h2>
      <p className="mt-2 max-w-prose text-[15px] font-medium text-chop-ink-secondary md:text-[16px]">
        {config.sub}
      </p>
      <ol className="mt-6 space-y-4 border-t border-divider pt-5">
        {config.steps.map(([title, body], i) => (
          <li key={title} className="flex items-start gap-3">
            <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-chop-red">
              {String(i + 1).padStart(2, '0')}.
            </span>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-chop-ink">{title}</p>
              <p className="mt-0.5 text-[13px] font-medium text-chop-ink-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild className="flex-1 sm:flex-none">
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 sm:flex-none">
          <Link href="/restaurants">Voir le feed</Link>
        </Button>
      </div>

      {/* PWA install nudge (#14) — once activated by admin, the vendor /
          livreur opens the app daily for orders / courses. Installed as a
          PWA they get push notifications + a home-screen icon. The
          PwaInstallPrompt only renders when `beforeinstallprompt` has
          actually fired in this session (Chrome/Edge); on iOS Safari it's
          quiet, which is fine — iOS users follow the manual share-sheet
          path anyway. */}
      <div className="mt-6 rounded-2xl border border-divider bg-chop-warm/60 p-4">
        <p className="text-[13px] font-semibold text-chop-ink">
          💡 Installe TChopNow sur ton téléphone
        </p>
        <p className="mt-1 text-[12px] font-medium text-chop-ink-secondary">
          Notifications instantanées pour chaque{' '}
          {role === 'vendor' ? 'commande qui arrive' : 'course assignée'}, raccourci sur
          l&apos;écran d&apos;accueil, ouverture en plein écran.
        </p>
        <div className="mt-3">
          <PwaInstallPrompt />
        </div>
      </div>
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
