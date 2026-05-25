'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { OtpRequestForm } from '@/features/auth/components/OtpRequestForm';
import { OtpVerifyForm } from '@/features/auth/components/OtpVerifyForm';
import { apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

/**
 * Story 1.1 — full OTP login flow with PWA-friendly back navigation
 * and a branded, viewport-filling layout.
 *
 * Layout: three flex-column bands fill the entire dvh:
 *   1. Compact header (chevron + wordmark)
 *   2. Title + form (anchored upper-middle)
 *   3. Bottom band that grows to fill: trust pills (mobile) + register
 *      section pinned to the bottom edge
 *
 * `min-h-dvh flex flex-col` ensures the bottom band reaches the safe-
 * area-inset of a PWA-installed screen even on tall iPhones, killing
 * the dead space we used to leave below the form.
 */
// `?next=` is attacker-controlled (anyone can craft a phishing URL). Allow
// only relative internal paths — strip protocol-relative `//evil.com`,
// absolute `https://evil.com`, and anything that's not a leading `/`.
// The proxy.ts route guard sanitizes outbound, but the login form may
// receive `?next=` from any source (manual links, WhatsApp shares,
// stale bookmarks) so we re-sanitize here.
function sanitizeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.includes('://')) return null;
  return raw;
}

function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = sanitizeNext(params.get('next'));
  const t = useTranslations('Auth');

  const [phone, setPhone] = React.useState<string | null>(null);

  const goBack = React.useCallback(() => {
    if (phone) {
      setPhone(null);
      return;
    }
    if (explicitNext) {
      router.push(explicitNext);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/restaurants');
  }, [phone, explicitNext, router]);

  const onVerified = async () => {
    if (explicitNext) {
      router.replace(explicitNext);
      return;
    }
    try {
      const me = await apiRaw.get<{ role: UserRole }>('/api/users/me');
      auth.saveRole(me.role);
      router.replace(redirectPathForRole(me.role));
    } catch {
      router.replace('/restaurants');
    }
  };

  const resend = async () => {
    if (phone) await auth.requestOtp(phone);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ── Header band ──────────────────────────────────────────── */}
      <header className="px-5 pt-5 md:px-8 md:pt-6">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 md:max-w-xl">
          <button
            type="button"
            onClick={goBack}
            aria-label={t('back')}
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-chop-ink transition-colors hover:bg-chop-surface-gray"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-base font-extrabold uppercase tracking-tight"
          >
            <Image src="/brand-icon.svg" alt="" width={28} height={28} aria-hidden priority />
            <span>
              TChop<span className="text-chop-red">Now.</span>
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Hero + form band — anchored upper-middle ─────────────── */}
      {/* On md+ we widen to max-w-xl and wrap the form area in a card
          so it no longer feels like a 400px column floating in
          whitespace. Mobile unchanged. */}
      <section className="container mx-auto w-full max-w-md px-5 pt-8 md:max-w-xl md:rounded-3xl md:bg-chop-card-white md:px-10 md:py-10 md:shadow-card lg:mt-4">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
          {phone ? (
            <>
              {t('otpStepTitleL1')}
              <br />
              <span className="text-chop-red">{t('otpStepTitleL2')}</span>
            </>
          ) : (
            <>
              {t('phoneStepTitleL1')}
              <br />
              <span className="text-chop-red">{t('phoneStepTitleL2')}</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-base text-chop-ink-secondary">
          {phone
            ? t('otpStepSubtitle', {
                part1: phone.slice(-9, -6),
                part2: phone.slice(-6, -3),
                part3: phone.slice(-3),
              })
            : t('phoneStepSubtitle')}
        </p>

        <div className="mt-8">
          {phone ? (
            <div className="space-y-5">
              <OtpVerifyForm phone={phone} onVerified={onVerified} onResend={resend} />
              <button
                type="button"
                onClick={() => setPhone(null)}
                className="text-sm font-semibold text-chop-ink-secondary underline-offset-2 hover:underline"
              >
                {t('changeNumber')}
              </button>
            </div>
          ) : (
            <OtpRequestForm onRequested={setPhone} />
          )}
        </div>
      </section>

      {/* ── Filler / trust band — only on phone-entry step ───────── */}
      {phone ? (
        <div className="flex-1" aria-hidden />
      ) : (
        <section className="mx-auto mt-10 w-full max-w-md flex-1 px-5 md:max-w-xl md:px-0">
          <ul className="grid grid-cols-3 gap-3">
            <TrustPill index="01">{t('trust1')}</TrustPill>
            <TrustPill index="02">{t('trust2')}</TrustPill>
            <TrustPill index="03">{t('trust3')}</TrustPill>
          </ul>
        </section>
      )}

      {/* ── Bottom band — register entry points, pinned to bottom ── */}
      {phone ? null : (
        <footer className="mx-auto w-full max-w-md px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-8 md:max-w-xl md:px-0">
          <div className="rounded-3xl bg-chop-card-white p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-chop-ink-secondary">
              {t('registerEyebrow')}
            </p>
            <p className="mt-1 text-sm text-chop-ink-secondary">
              {t.rich('registerBody', {
                strong: (chunks) => <strong className="text-chop-ink">{chunks}</strong>,
              })}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/vendre"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-chop-ink px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red"
              >
                {t('registerVendor')}
              </Link>
              <Link
                href="/livrer"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-chop-ink px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red"
              >
                {t('registerRider')}
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

/**
 * Compact 3-up trust signal block that lives between the form and the
 * register section. Fills the otherwise-dead middle of the screen on
 * tall phones with content that supports the conversion ("c'est rapide,
 * c'est WhatsApp, pas de mot de passe") rather than padding.
 */
function TrustPill({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-divider bg-chop-card-white px-3 py-4">
      <span className="text-[11px] font-extrabold tracking-[0.16em] text-chop-red" aria-hidden>
        {index}
      </span>
      <span className="text-[11px] font-semibold leading-[1.25] text-chop-ink">{children}</span>
    </li>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <React.Suspense fallback={<LoginFallback />}>
        <LoginScreen />
      </React.Suspense>
    </main>
  );
}

function LoginFallback() {
  const t = useTranslations('Auth');
  return <div className="container max-w-md py-10 text-sm">{t('loadingFallback')}</div>;
}
