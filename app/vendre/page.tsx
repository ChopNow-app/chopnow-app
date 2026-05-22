import Link from 'next/link';
import { VendorOnboardingForm } from '@/features/vendor-onboarding/components/VendorOnboardingForm';

export const metadata = {
  title: 'Devenir vendeur — TChopNow',
  description:
    'Inscris ta cuisine sur TChopNow. Validation sous 24h. Gratuit. Commission seulement sur les commandes livrées.',
};

// Story 2.0 — vendor onboarding landing. Rebuilt in the Hot Plate Editorial
// aesthetic to match the rest of the app (splash + /restaurants + /).
export default function VendrePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-chop-warm text-chop-ink">
      {/* paper grain — same 3% noise overlay as the splash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Top nav band — wordmark + back link */}
      <header className="relative z-10 border-b border-divider/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="text-[15px] font-extrabold uppercase tracking-[0.18em]">
            TChop<span className="text-chop-red">Now.</span>
          </Link>
          <Link
            href="/"
            className="text-[12px] font-semibold text-chop-ink-secondary transition-colors hover:text-chop-red"
          >
            ← Retour
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-8 md:px-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
          Inscription <span className="text-chop-red">·</span> Vendeur
        </p>
        <h1 className="mt-3 text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[56px]">
          Mets ta cuisine
          <br />
          <span className="text-chop-red">sur TChopNow.</span>
        </h1>
        <p className="mt-5 max-w-[44ch] text-[15px] font-medium leading-[1.55] text-chop-ink-secondary md:text-[17px]">
          Gratuit. Validation sous 24h. Commission seulement quand on te livre une commande — pas de
          mensualité, pas de frais d&apos;inscription.
        </p>
      </section>

      {/* Form */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-8 md:px-8 md:pt-10">
        <VendorOnboardingForm />
      </section>

      {/* Status-check footer link (#13) — vendors who already submitted
          can come back to this URL anytime, click here, and check where
          their dossier sits without re-filing the whole form. */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-8 text-center text-[13px] font-medium text-chop-ink-secondary md:px-8">
        Déjà inscrit ?{' '}
        <Link
          href="/statut"
          className="font-semibold text-chop-red underline-offset-2 hover:underline"
        >
          Vérifier mon statut
        </Link>
      </section>
    </main>
  );
}
