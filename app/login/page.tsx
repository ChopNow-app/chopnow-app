'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { OtpRequestForm } from '@/features/auth/components/OtpRequestForm';
import { OtpVerifyForm } from '@/features/auth/components/OtpVerifyForm';
import { apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

/**
 * Story 1.1 — full OTP login flow with PWA-friendly back navigation
 * and a branded header.
 *
 * Two screens stacked in one route: request a code (phone in), verify
 * it (6-digit code in). On success we redirect to:
 *   - the `?next=` path if provided (e.g. checkout came here to
 *     authenticate and wants its caller back)
 *   - otherwise the role-specific surface (vendor → /vendor, rider →
 *     /livreur, consumer → /restaurants) so a vendor opening a fresh
 *     tab never sees the consumer marketing splash again
 *
 * Next 16 build-time prerender bails out of CSR pages that read
 * `useSearchParams()` without a Suspense boundary — we provide one
 * here.
 */
function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get('next');

  const [phone, setPhone] = React.useState<string | null>(null);

  // Back navigation that works inside a standalone PWA where the
  // browser back button is hidden. Honors `?next=` (so /vendor → /login
  // sends them back to /vendor on cancel), falls back to history.back()
  // when the back stack is non-empty (normal in-app nav), or hard-routes
  // to /restaurants when the user landed directly on /login (e.g. a
  // saved bookmark or a cold home-screen tap that hit /login somehow).
  const goBack = React.useCallback(() => {
    if (phone) {
      // Mid-verify step: "back" means re-enter phone number, not leave the page
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
      // Persist the role so the next PWA cold-launch routes vendors /
      // riders to their dashboards instantly (LaunchRedirector reads
      // this via auth.getRole() and avoids a /users/me roundtrip).
      auth.saveRole(me.role);
      router.replace(redirectPathForRole(me.role));
    } catch {
      // /users/me failed (network blip just after login). Fall back to
      // the consumer surface — it's the safest universal landing.
      router.replace('/restaurants');
    }
  };

  const resend = async () => {
    if (phone) await auth.requestOtp(phone);
  };

  return (
    <>
      {/* Header band: chevron-back (PWA-essential), brand mark centred,
          empty slot on the right keeps the logo optically centred. */}
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

      <section className="container max-w-md py-8 md:py-10">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {phone ? (
            <>
              Code de <span className="text-chop-red">vérification.</span>
            </>
          ) : (
            <>
              Bon <span className="text-chop-red">retour.</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-chop-ink-secondary">
          {phone
            ? `Saisis le code reçu sur WhatsApp au +237 ${phone.slice(-9, -6)} ${phone.slice(-6, -3)} ${phone.slice(-3)}.`
            : "Entre ton numéro de téléphone — nous t'envoyons un code par WhatsApp en quelques secondes."}
        </p>

        <div className="mt-6">
          {phone ? (
            <div className="space-y-4">
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
            <>
              <OtpRequestForm onRequested={setPhone} />

              {/* Discovery for users who tapped "Se connecter" but actually
                  want to register as a vendor or rider. The OTP form above
                  auto-creates a new consumer account on first verify, so
                  this section is specifically for the two paid-side roles
                  whose registration is a separate form, not just an OTP. */}
              <div className="mt-10 border-t border-divider pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-chop-ink-secondary">
                  Pas encore inscrit&nbsp;?
                </p>
                <p className="mt-1 text-sm text-chop-ink-secondary">
                  Si tu veux <strong className="text-chop-ink">vendre tes plats</strong> ou{' '}
                  <strong className="text-chop-ink">livrer à moto</strong>, il faut d&apos;abord
                  déposer un dossier&nbsp;:
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
            </>
          )}
        </div>
      </section>
    </>
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
