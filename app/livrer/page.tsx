import Link from 'next/link';
import { RiderOnboardingForm } from '@/features/rider-onboarding/components/RiderOnboardingForm';

export const metadata = {
  title: 'Devenir livreur — TChopNow',
  description:
    'Livre pour TChopNow à Douala. Validation sous 4h. Paie hebdomadaire chaque samedi 22h via MoMo. Tu choisis tes heures.',
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
          Paie hebdomadaire chaque samedi 22h via MoMo. Tu choisis tes heures. Validation sous 4h.
          Pas de frais d&apos;inscription, pas de caution.
        </p>
      </section>

      {/* Earnings estimator (#10) — persuasive panel between hero + form.
          Pilot-week numbers based on:
            - 5-10 courses/day at the pilot's scale (50 cmd/day → 3 riders)
            - 600-800 FCFA livreur fee per course in Douala moto market
          Range stays conservative so we don't over-promise. */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-10 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-chop-ink text-white shadow-elevated">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-chop-red/20 blur-3xl"
          />
          <div className="relative p-6 md:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Estimation pilote
            </p>
            <h2 className="mt-2 text-[34px] font-extrabold leading-[0.95] tracking-[-0.02em] md:text-[44px]">
              <span className="text-chop-red">1 500</span> à{' '}
              <span className="text-chop-red">5 000</span>
              <span className="ml-2 text-[18px] font-bold tracking-normal text-white/70 md:text-[22px]">
                FCFA / jour
              </span>
            </h2>
            <p className="mt-2 max-w-[44ch] text-[13px] font-medium text-white/70 md:text-[14px]">
              Selon le nombre de courses que tu prends. À Bonamoussadi / Makepe pendant le pilote, 5
              à 10 courses par jour sont typiques.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-3 text-[12px] font-semibold text-white md:grid-cols-3">
              <li className="flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <span aria-hidden>💰</span>
                <span>Paie samedi 22h via MoMo</span>
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <span aria-hidden>📱</span>
                <span>Tu choisis tes heures</span>
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
                <span aria-hidden>🏍️</span>
                <span>Moto, vélo ou à pied</span>
              </li>
            </ul>
            <p className="mt-4 text-[11px] font-medium text-white/55">
              Estimations basées sur le marché Douala. Pas un revenu garanti — dépend de ta
              disponibilité et de la densité de commandes dans ta zone.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-3xl px-5 pt-8 md:px-8 md:pt-10">
        <RiderOnboardingForm />
      </section>

      {/* Status-check footer link (#13) — riders who already submitted
          can check their dossier state without going through onboarding
          again. */}
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
