'use client';

// React 19's react-hooks/set-state-in-effect bites the blob-URL preview
// pattern in PhotoPicker. Same precedent as features/consumer/hooks/useCatalogue.ts.

import * as React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/PhoneInput';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import {
  BrandInput,
  ErrorBanner,
  Field,
  FormSection,
  PhotoPicker,
  RadioCard,
} from '@/components/forms/onboarding-atoms';
import { ApiClientError } from '@/lib/api/api-client';

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
      {/* Note: a server-rendered lazy-loaded module can't call useTranslations,
          so this localized fallback is shown only by the SSR shell. The hook-
          driven version takes over once the component is hydrated. */}
    </div>
  ),
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// 9-digit Cameroon local (PhoneInput strips to digits) OR E.164. The backend
// re-validates with the same pattern.
const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;

// Schema built inside the component (see VendorOnboardingForm below) so
// error messages are locale-aware.

type FormValues = {
  name: string;
  ownerName: string;
  type: 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
  quartier: string;
  pointOfReference?: string;
  whatsappPhone: string;
  momoPhone: string;
  declaredCapacity: 'LT_10' | 'R_10_30' | 'GT_30';
  firstItemName: string;
  firstItemPriceXAF: number;
  extraItem1Name?: string;
  extraItem1PriceXAF?: number | '';
  extraItem2Name?: string;
  extraItem2PriceXAF?: number | '';
  rccmNumber?: string;
  niuNumber?: string;
};

type CapacityOption = {
  value: 'LT_10' | 'R_10_30' | 'GT_30';
  labelKey: 'capacityLT10' | 'capacityR1030' | 'capacityGT30';
  subKey: 'capacityLT10Sub' | 'capacityR1030Sub' | 'capacityGT30Sub';
};
const CAPACITY_OPTIONS: CapacityOption[] = [
  { value: 'LT_10', labelKey: 'capacityLT10', subKey: 'capacityLT10Sub' },
  { value: 'R_10_30', labelKey: 'capacityR1030', subKey: 'capacityR1030Sub' },
  { value: 'GT_30', labelKey: 'capacityGT30', subKey: 'capacityGT30Sub' },
];

type TypeOption = {
  value: 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
  labelKey: 'typeInformal' | 'typeSemiFormal' | 'typeRestaurant';
  subKey: 'typeInformalSub' | 'typeSemiFormalSub' | 'typeRestaurantSub';
};
const TYPE_OPTIONS: TypeOption[] = [
  { value: 'INFORMAL', labelKey: 'typeInformal', subKey: 'typeInformalSub' },
  { value: 'SEMI_FORMAL', labelKey: 'typeSemiFormal', subKey: 'typeSemiFormalSub' },
  { value: 'RESTAURANT', labelKey: 'typeRestaurant', subKey: 'typeRestaurantSub' },
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
  const t = useTranslations('VendorOnboarding');
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null);
  const [firstItemPhoto, setFirstItemPhoto] = React.useState<File | null>(null);
  const [coords, setCoords] = React.useState<Coords | null>(null);
  const [gpsState, setGpsState] = React.useState<'idle' | 'requesting' | 'denied'>('idle');
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [photoError, setPhotoError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  // Restaurant-only enseigne (storefront) photo. Stays on the form even
  // when type=INFORMAL is selected — the conditional render below hides
  // its block, but we don't reset the file when the user toggles types
  // back and forth (cheaper UX than re-prompting).
  const [enseignePhoto, setEnseignePhoto] = React.useState<File | null>(null);

  const schema = React.useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, t('validationMin2')).max(80),
          ownerName: z.string().min(2, t('validationMin2')).max(80),
          type: z.enum(['INFORMAL', 'SEMI_FORMAL', 'RESTAURANT'], {
            errorMap: () => ({ message: t('validationType') }),
          }),
          quartier: z.string().min(2, t('validationQuartier')).max(80),
          pointOfReference: z.string().max(200).optional().or(z.literal('')),
          whatsappPhone: z.string().regex(PHONE, t('validationWhatsapp')),
          momoPhone: z.string().regex(PHONE, t('validationMomo')),
          declaredCapacity: z.enum(['LT_10', 'R_10_30', 'GT_30'], {
            errorMap: () => ({ message: t('validationCapacity') }),
          }),
          firstItemName: z.string().min(2, t('validationMin2')).max(80),
          firstItemPriceXAF: z.coerce
            .number()
            .int()
            .min(100, t('validationPriceMin'))
            .max(1_000_000),
          extraItem1Name: z.string().max(80).optional().or(z.literal('')),
          extraItem1PriceXAF: z
            .union([z.coerce.number().int().min(100).max(1_000_000), z.literal('')])
            .optional(),
          extraItem2Name: z.string().max(80).optional().or(z.literal('')),
          extraItem2PriceXAF: z
            .union([z.coerce.number().int().min(100).max(1_000_000), z.literal('')])
            .optional(),
          rccmNumber: z.string().max(50).optional().or(z.literal('')),
          niuNumber: z.string().max(20).optional().or(z.literal('')),
        })
        .superRefine((data, ctx) => {
          if (data.type !== 'RESTAURANT') return;
          if (!data.rccmNumber || data.rccmNumber.length < 5) {
            ctx.addIssue({
              code: 'custom',
              path: ['rccmNumber'],
              message: t('validationRccm'),
            });
          }
          if (!data.niuNumber || data.niuNumber.length < 8) {
            ctx.addIssue({
              code: 'custom',
              path: ['niuNumber'],
              message: t('validationNiu'),
            });
          }
        }),
    [t],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
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
      setPhotoError(t('frontPhotoMissing'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (values.type === 'RESTAURANT' && !enseignePhoto) {
      setPhotoError(t('enseigneRequired'));
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
      // Extras — only sent when both halves are filled. Empty strings or
      // partial pairs are silently dropped (matches the backend's `&&`
      // guard in vendor.service.ts).
      if (values.extraItem1Name && values.extraItem1PriceXAF) {
        form.append('extraItem1Name', values.extraItem1Name);
        form.append('extraItem1PriceXAF', String(values.extraItem1PriceXAF));
      }
      if (values.extraItem2Name && values.extraItem2PriceXAF) {
        form.append('extraItem2Name', values.extraItem2Name);
        form.append('extraItem2PriceXAF', String(values.extraItem2PriceXAF));
      }
      if (coords) {
        form.append('latitude', String(coords.latitude));
        form.append('longitude', String(coords.longitude));
      }
      form.append('profilePhoto', profilePhoto);
      if (firstItemPhoto) form.append('firstItemPhoto', firstItemPhoto);
      // Restaurant KYC payload. The backend's @ValidateIf only requires
      // these when type=RESTAURANT, so we send them as-is — empty strings
      // for non-restaurants are silently ignored server-side.
      if (values.type === 'RESTAURANT') {
        if (values.rccmNumber) form.append('rccmNumber', values.rccmNumber);
        if (values.niuNumber) form.append('niuNumber', values.niuNumber);
        if (enseignePhoto) form.append('enseignePhoto', enseignePhoto);
      }

      const res = await fetch(`${API_URL}/api/v1/vendors`, { method: 'POST', body: form });
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
        <Field label={t('kitchenName')} error={errors.name?.message}>
          <BrandInput placeholder={t('kitchenNamePlaceholder')} {...register('name')} />
        </Field>
        <Field label={t('ownerName')} error={errors.ownerName?.message}>
          <BrandInput
            placeholder={t('ownerNamePlaceholder')}
            autoComplete="name"
            {...register('ownerName')}
          />
        </Field>
        <Field label={t('kitchenType')}>
          <fieldset className="space-y-2">
            {TYPE_OPTIONS.map((opt) => (
              <RadioCard
                key={opt.value}
                value={opt.value}
                label={t(opt.labelKey)}
                sub={t(opt.subKey)}
                {...register('type')}
              />
            ))}
            {errors.type ? (
              <p className="mt-1 text-xs font-medium text-chop-danger">{errors.type.message}</p>
            ) : null}
          </fieldset>
        </Field>

        {/* Restaurant-only KYC block. Reveals when the type radio flips to
            RESTAURANT — the schema's superRefine then enforces RCCM + NIU
            presence and the FormData payload includes the enseigne photo.
            Backend re-validates via @ValidateIf decorators. */}
        {watch('type') === 'RESTAURANT' ? (
          <div className="rounded-2xl border-2 border-chop-red/20 bg-chop-red-light/30 p-4">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-widest text-chop-red">
              {t('kycHeading')}
            </p>
            <div className="space-y-3">
              <Field label={t('rccmLabel')} hint={t('rccmHint')} error={errors.rccmNumber?.message}>
                <BrandInput
                  placeholder={t('rccmPlaceholder')}
                  autoComplete="off"
                  {...register('rccmNumber')}
                />
              </Field>
              <Field label={t('niuLabel')} hint={t('niuHint')} error={errors.niuNumber?.message}>
                <BrandInput
                  placeholder={t('niuPlaceholder')}
                  autoComplete="off"
                  {...register('niuNumber')}
                />
              </Field>
              <PhotoPicker
                label={t('enseigneLabel')}
                hint={t('enseigneHint')}
                helperText={t('enseigneHelper')}
                file={enseignePhoto}
                onPick={setEnseignePhoto}
                required
              />
              {!enseignePhoto ? (
                <p className="text-[11px] font-medium text-chop-danger">{t('enseigneRequired')}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Field label={t('quartier')} error={errors.quartier?.message}>
          <BrandInput placeholder={t('quartierPlaceholder')} {...register('quartier')} />
        </Field>
        <Field label={t('pointOfReference')} hint={t('pointOfReferenceHint')}>
          <BrandInput
            placeholder={t('pointOfReferencePlaceholder')}
            {...register('pointOfReference')}
          />
        </Field>

        {/* GPS capture — vendor's actual location pin. Without this every
            onboarded vendor lands at Douala center and the distance ranking
            is broken for them. Optional — backend falls back to city center. */}
        <Field label={t('gpsLabel')} hint={t('gpsHint')}>
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

      <FormSection num="03" title={t('section3')}>
        <fieldset className="space-y-2">
          {CAPACITY_OPTIONS.map((opt) => (
            <RadioCard
              key={opt.value}
              value={opt.value}
              label={t(opt.labelKey)}
              sub={t(opt.subKey)}
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

      <FormSection num="04" title={t('section4')}>
        <Field label={t('dishName')} error={errors.firstItemName?.message}>
          <BrandInput placeholder={t('dishNamePlaceholder')} {...register('firstItemName')} />
        </Field>
        <Field label={t('dishPrice')} error={errors.firstItemPriceXAF?.message}>
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
          label={t('dishPhotoLabel')}
          helperText={t('dishPhotoHelper')}
          file={firstItemPhoto}
          onPick={setFirstItemPhoto}
        />
      </FormSection>

      {/* Multi-item onboarding (#12) — 2 optional extras. No photos here
          to keep the form fast; vendor adds richer items via the
          /vendor dashboard once activated. */}
      <FormSection num="05" title={t('section5')}>
        <p className="-mt-2 text-[12px] font-medium text-chop-ink-secondary">{t('section5Body')}</p>
        <ExtraItemRow
          n={1}
          registerName={register('extraItem1Name')}
          registerPrice={register('extraItem1PriceXAF')}
          nameError={errors.extraItem1Name?.message}
          priceError={errors.extraItem1PriceXAF?.message}
        />
        <ExtraItemRow
          n={2}
          registerName={register('extraItem2Name')}
          registerPrice={register('extraItem2PriceXAF')}
          nameError={errors.extraItem2Name?.message}
          priceError={errors.extraItem2PriceXAF?.message}
        />
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

// ─── Form-local helpers (atoms shared with other surfaces live in
//     @/components/forms/onboarding-atoms — this file imports them above)

// Extra-item input row (#12). Name + price in a single horizontal pair on
// tablet+, stacked on mobile. Visually grouped so the user understands
// "these two fields belong together" without an explicit label.
function ExtraItemRow({
  n,
  registerName,
  registerPrice,
  nameError,
  priceError,
}: {
  n: number;
  registerName: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  registerPrice: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
  nameError?: string;
  priceError?: string;
}) {
  const t = useTranslations('VendorOnboarding');
  return (
    <div className="rounded-2xl border border-divider bg-chop-warm/40 p-3">
      <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-chop-ink-secondary">
        {t('extraItemPrefix', { n })}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
        <div>
          <BrandInput placeholder={t('extraItemNamePh')} {...registerName} />
          {nameError ? (
            <p className="mt-1 text-xs font-medium text-chop-danger">{nameError}</p>
          ) : null}
        </div>
        <div>
          <BrandInput
            type="number"
            inputMode="numeric"
            min={100}
            step={100}
            placeholder={t('extraItemPricePh')}
            {...registerPrice}
          />
          {priceError ? (
            <p className="mt-1 text-xs font-medium text-chop-danger">{priceError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Shared success state ────────────────────────────────────────────────

export function SuccessState({ role }: { role: 'vendor' | 'rider' }) {
  const t = useTranslations('OnboardingSuccess');
  const config =
    role === 'vendor'
      ? {
          title: t('vendorTitle'),
          sub: t('vendorSub'),
          steps: [
            [t('vendorStep1Title'), t('vendorStep1Body')],
            [t('vendorStep2Title'), t('vendorStep2Body')],
            [t('vendorStep3Title'), t('vendorStep3Body')],
          ],
        }
      : {
          title: t('riderTitle'),
          sub: t('riderSub'),
          steps: [
            [t('riderStep1Title'), t('riderStep1Body')],
            [t('riderStep2Title'), t('riderStep2Body')],
            [t('riderStep3Title'), t('riderStep3Body')],
          ],
        };
  return (
    <div className="relative overflow-hidden rounded-3xl bg-chop-card-white p-7 shadow-elevated md:p-10">
      <p
        aria-hidden
        className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-mboue"
      >
        {t('eyebrow')}
      </p>
      <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-tight text-chop-ink md:text-[32px]">
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
          <Link href="/">{t('backHome')}</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1 sm:flex-none">
          <Link href="/restaurants">{t('viewFeed')}</Link>
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
        <p className="text-[13px] font-semibold text-chop-ink">{t('pwaTitle')}</p>
        <p className="mt-1 text-[12px] font-medium text-chop-ink-secondary">
          {role === 'vendor' ? t('pwaBodyVendor') : t('pwaBodyRider')}
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
