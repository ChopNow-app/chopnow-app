'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { OtpRequestForm } from '@/features/auth/components/OtpRequestForm';
import { OtpVerifyForm } from '@/features/auth/components/OtpVerifyForm';
import { apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { redirectPathForRole, type UserRole } from '@/lib/auth/role-redirect';

/**
 * Story 1.1 — full OTP login flow.
 *
 * Two screens stacked in one route: request a code (phone in), verify it
 * (6-digit code in). On success we redirect to:
 *   - the `?next=` path if provided (e.g. checkout came here to authenticate
 *     and wants its caller back)
 *   - otherwise the role-specific surface (vendor → /vendor, rider →
 *     /livreur, consumer → /restaurants) so a vendor opening a fresh tab
 *     never sees the consumer marketing splash again
 *
 * Next 16 build-time prerender bails out of CSR pages that read
 * `useSearchParams()` without a Suspense boundary — we provide one here.
 */
function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const explicitNext = params.get('next');

  const [phone, setPhone] = React.useState<string | null>(null);

  const onVerified = async () => {
    // If the caller demanded a specific landing (e.g. /checkout after auth-gate),
    // honor it. Otherwise route by role.
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
      // /users/me failed (network blip just after login). Fall back to the
      // consumer surface — it's the safest universal landing.
      router.replace('/restaurants');
    }
  };

  const resend = async () => {
    if (phone) await auth.requestOtp(phone);
  };

  return (
    <section className="container max-w-md py-10">
      <h1 className="mb-2 text-3xl font-extrabold">
        {phone ? 'Code de vérification' : 'Connexion'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {phone
          ? 'Saisis le code reçu sur WhatsApp pour terminer la connexion.'
          : "Entre ton numéro de téléphone — nous t'envoyons un code par WhatsApp."}
      </p>

      {phone ? (
        <div className="space-y-4">
          <OtpVerifyForm phone={phone} onVerified={onVerified} onResend={resend} />
          <button
            type="button"
            onClick={() => setPhone(null)}
            className="text-sm text-muted-foreground underline"
          >
            ← Changer de numéro
          </button>
        </div>
      ) : (
        <OtpRequestForm onRequested={setPhone} />
      )}
    </section>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <header className="container py-4">
        <Link href="/" className="text-xl font-extrabold uppercase tracking-tight">
          TChopNow
        </Link>
      </header>

      <React.Suspense
        fallback={<div className="container max-w-md py-10 text-sm">Chargement…</div>}
      >
        <LoginScreen />
      </React.Suspense>
    </main>
  );
}
