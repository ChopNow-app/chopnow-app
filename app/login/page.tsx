'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, MessageCircle, ShieldCheck, Zap } from 'lucide-react';

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
function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get('next');

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
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Retour"
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
          <span className="h-10 w-10" aria-hidden />
        </div>
      </header>

      {/* ── Hero + form band — anchored upper-middle ─────────────── */}
      <section className="container mx-auto w-full max-w-md px-5 pt-8 md:px-8 md:pt-12">
        <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
          {phone ? (
            <>
              Code de
              <br />
              <span className="text-chop-red">vérification.</span>
            </>
          ) : (
            <>
              Bon
              <br />
              <span className="text-chop-red">retour.</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-base text-chop-ink-secondary">
          {phone
            ? `Code envoyé sur WhatsApp au +237 ${phone.slice(-9, -6)} ${phone.slice(-6, -3)} ${phone.slice(-3)}.`
            : "Ton numéro de téléphone — on t'envoie un code par WhatsApp en quelques secondes."}
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
                ← Changer de numéro
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
        <section className="mx-auto mt-10 w-full max-w-md flex-1 px-5 md:px-8">
          <ul className="grid grid-cols-3 gap-3">
            <TrustPill icon={<Zap className="h-4 w-4" strokeWidth={2.4} aria-hidden />}>
              Connexion en quelques secondes
            </TrustPill>
            <TrustPill icon={<MessageCircle className="h-4 w-4" strokeWidth={2.4} aria-hidden />}>
              Code par WhatsApp
            </TrustPill>
            <TrustPill icon={<ShieldCheck className="h-4 w-4" strokeWidth={2.4} aria-hidden />}>
              Pas de mot de passe à retenir
            </TrustPill>
          </ul>
        </section>
      )}

      {/* ── Bottom band — register entry points, pinned to bottom ── */}
      {phone ? null : (
        <footer className="mx-auto w-full max-w-md px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-8 md:px-8">
          <div className="rounded-3xl bg-chop-card-white p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-chop-ink-secondary">
              Pas encore inscrit&nbsp;?
            </p>
            <p className="mt-1 text-sm text-chop-ink-secondary">
              Pour <strong className="text-chop-ink">vendre tes plats</strong> ou{' '}
              <strong className="text-chop-ink">livrer à moto</strong>, dépose ton dossier&nbsp;:
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/vendre"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-chop-ink px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red"
              >
                Devenir vendeur
              </Link>
              <Link
                href="/livrer"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-chop-ink px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-chop-red"
              >
                Devenir livreur
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
function TrustPill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex flex-col items-center gap-2 rounded-2xl bg-chop-surface-gray px-2 py-3 text-center">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-chop-card-white text-chop-red">
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase leading-[1.15] tracking-wide text-chop-ink-secondary">
        {children}
      </span>
    </li>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <React.Suspense
        fallback={<div className="container max-w-md py-10 text-sm">Chargement…</div>}
      >
        <LoginScreen />
      </React.Suspense>
    </main>
  );
}
