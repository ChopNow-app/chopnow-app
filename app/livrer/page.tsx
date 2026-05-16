import Link from 'next/link';
import { RiderOnboardingForm } from '@/features/rider-onboarding/components/RiderOnboardingForm';

export const metadata = {
  title: 'Devenir livreur — TChopNow',
  description:
    'Livre pour TChopNow à Douala. Validation sous 4h. Paie quotidienne via MoMo. Tu choisis tes heures.',
};

// Story 1.4 — rider onboarding landing. Same Hot Plate aesthetic as /vendre.
export default function LivrerPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-chop-warm text-chop-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

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

      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-8 md:px-8 md:pt-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
          Inscription <span className="text-chop-red">·</span> Livreur
        </p>
        <h1 className="mt-3 text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em] md:text-[56px]">
          Roule avec
          <br />
          <span className="text-chop-red">TChopNow.</span>
        </h1>
        <p className="mt-5 max-w-[44ch] text-[15px] font-medium leading-[1.55] text-chop-ink-secondary md:text-[17px]">
          Paie quotidienne via MoMo. Tu choisis tes heures. Validation sous 4h. Pas de frais
          d&apos;inscription, pas de caution.
        </p>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-8 md:px-8 md:pt-10">
        <RiderOnboardingForm />
      </section>
    </main>
  );
}
