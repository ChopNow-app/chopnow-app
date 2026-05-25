'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  BrandInput,
  ErrorBanner,
  Field,
  FormSection,
  PhotoPicker,
} from '@/components/forms/onboarding-atoms';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { useVendorProfile } from '../hooks/useVendorProfile';

// Same phone pattern as onboarding — 9-digit Cameroon local or E.164.
const PHONE = /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/;

type FormValues = {
  name: string;
  description?: string | '';
  momoPhone: string;
};

/**
 * Vendor self-service profile editor. Saves trigger up to 3 API calls:
 *
 *   1. PATCH /vendors/me                 (name + description + momoPhone)
 *   2. PATCH /vendors/me/photo           (only if profile photo changed)
 *   3. PATCH /vendors/me/cover           (only if cover photo changed)
 *
 * Sequenced not parallel because: text fields are the source of truth for
 * the catalogue card label; uploading photos before the rename succeeds
 * would leave the consumer-side card showing the new photo but old name
 * for a few seconds. Same reason we don't optimistic-update — saved state
 * comes from the server's response.
 *
 * Quartier + landmark + type stay admin-controlled (see PATCH /vendors/me
 * dto). The vendor can request a quartier change via support; not
 * self-serve.
 */
export function VendorProfileScreen() {
  const t = useTranslations('Vendor');
  const profile = useVendorProfile();
  const [profilePhoto, setProfilePhoto] = React.useState<File | null>(null);
  const [coverPhoto, setCoverPhoto] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Built inside the component so the validation messages pick up the
  // current locale.
  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().min(2, t('profileValidationName')).max(80),
        description: z.string().max(500).optional().or(z.literal('')),
        momoPhone: z.string().regex(PHONE, t('profileValidationMomo')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', momoPhone: '' },
  });

  // Seed the form once the API load resolves. Effect intentionally
  // depends on `profile.status` ONLY (not the inner fields) — we want
  // a single seed on the loading → ready transition, not a re-seed
  // on every TanStack-Query refetch (which would clobber the user's
  // in-progress edits). The lint rule wants us to inline the data
  // fields too; doing so changes the semantic from "seed once" to
  // "re-seed on every refetch."
  React.useEffect(() => {
    if (profile.status === 'ready') {
      reset({
        name: profile.data.name,
        description: profile.data.description ?? '',
        momoPhone: profile.data.momoPhone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.status, reset]);

  if (profile.status === 'loading') {
    return (
      <Shell>
        <BackBar />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-chop-card-white shadow-card"
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (profile.status === 'unauthenticated') {
    return (
      <Shell>
        <EmptyState
          title={t('profileAuthTitle')}
          message={t('profileAuthBody')}
          ctaHref="/login?next=/vendor/profile"
          ctaLabel={t('profileAuthCta')}
        />
      </Shell>
    );
  }

  if (profile.status === 'not_found') {
    return (
      <Shell>
        <EmptyState
          title={t('profileNotFoundTitle')}
          message={t('profileNotFoundBody')}
          ctaHref="/vendre"
          ctaLabel={t('profileNotFoundCta')}
        />
      </Shell>
    );
  }

  if (profile.status === 'error') {
    return (
      <Shell>
        <BackBar />
        <ErrorBanner message={profile.message} />
      </Shell>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      // 1. Text fields (skip if nothing changed AND no photos to upload —
      //    saves a no-op PATCH when the user only swaps photos).
      if (isDirty) {
        await apiRaw.patch('/api/v1/vendors/me', {
          name: values.name,
          description: values.description || undefined,
          momoPhone: values.momoPhone,
        });
      }
      // 2. Profile photo
      if (profilePhoto) {
        const form = new FormData();
        form.append('photo', profilePhoto);
        await apiRaw.upload('/api/v1/vendors/me/photo', form, 'PATCH');
        setProfilePhoto(null);
      }
      // 3. Cover photo
      if (coverPhoto) {
        const form = new FormData();
        form.append('photo', coverPhoto);
        await apiRaw.upload('/api/v1/vendors/me/cover', form, 'PATCH');
        setCoverPhoto(null);
      }
      // Pull fresh state so the seeded values reflect the server's truth
      // (in case the backend normalises momoPhone for example).
      profile.reload();
      setSuccess(true);
    } catch (err) {
      setError(extractMessage(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell>
      <BackBar />

      <header className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {t('profileEyebrow')}
          </p>
          <h1 className="mt-0.5 truncate text-xl font-extrabold tracking-tight">
            {profile.data.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {profile.data.badge ?? profile.data.type} · {profile.data.quartier}
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
        <FormSection num="01" title={t('profileInfoSection')}>
          <Field label={t('profileInfoName')} error={errors.name?.message}>
            <BrandInput placeholder={t('profileInfoNamePh')} {...register('name')} />
          </Field>
          <Field
            label={t('profileInfoDesc')}
            hint={t('profileInfoDescHint')}
            error={errors.description?.message}
          >
            <BrandInput
              placeholder={t('profileInfoDescPh')}
              maxLength={500}
              {...register('description')}
            />
          </Field>
          <Field
            label={t('profileInfoMomo')}
            hint={t('profileInfoMomoHint')}
            error={errors.momoPhone?.message}
          >
            <BrandInput
              type="tel"
              autoComplete="tel"
              placeholder={t('profileInfoMomoPh')}
              {...register('momoPhone')}
            />
          </Field>
        </FormSection>

        <FormSection num="02" title={t('profilePhotosSection')}>
          <PhotoPicker
            label={t('profilePhotoProfile')}
            hint={t('profilePhotoProfileHint')}
            file={profilePhoto}
            onPick={setProfilePhoto}
          />
          <PhotoPicker
            label={t('profilePhotoCover')}
            hint={t('profilePhotoCoverHint')}
            file={coverPhoto}
            onPick={setCoverPhoto}
          />
        </FormSection>

        {error ? <ErrorBanner message={error} /> : null}
        {success ? (
          <div className="rounded-xl border-l-4 border-chop-mboue bg-chop-mboue-light px-4 py-3 text-[13px] font-medium text-chop-mboue">
            {t('profileUpdatedToast')}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          disabled={saving || (!isDirty && !profilePhoto && !coverPhoto)}
          className="w-full gap-2 bg-chop-red text-base shadow-card hover:bg-chop-red/90 disabled:opacity-50"
        >
          <Save className="h-5 w-5" aria-hidden />
          {saving ? t('saveProgress') : t('profileSaveCta')}
        </Button>

        <Link
          href="/vendor"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-chop-card-white px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-chop-surface-gray"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('ctaBackDashboard')}
        </Link>
      </form>
    </Shell>
  );
}

function BackBar() {
  const t = useTranslations('Vendor');
  return (
    <Link
      href="/vendor"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-chop-card-white text-chop-ink shadow-card transition-colors hover:bg-chop-surface-gray"
      aria-label={t('ariaBack')}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-chop-surface-gray">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-5 md:max-w-3xl md:px-8">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  const t = useTranslations('Vendor');
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <p
        aria-hidden
        className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red"
      >
        {t('profileEyebrowSection')}
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}

function extractMessage(err: unknown, t: ReturnType<typeof useTranslations<'Vendor'>>): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { message?: string } | undefined;
    return body?.message ?? t('errorPrefix', { status: err.status });
  }
  return (err as Error)?.message ?? t('errorNetwork');
}
