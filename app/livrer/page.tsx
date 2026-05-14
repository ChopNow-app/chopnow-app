import { RiderOnboardingForm } from '@/features/rider-onboarding/components/RiderOnboardingForm';

export const metadata = {
  title: 'Devenir livreur — ChopNow',
  description:
    'Livre pour ChopNow à Douala. Validation sous 4h. Paie quotidienne via MoMo. Tu choisis tes heures.',
};

export default function LivrerPage() {
  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Inscription livreur
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Roule avec ChopNow</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Paie quotidienne via MoMo. Tu choisis tes heures. Validation sous 4h. Pas de frais
          d&apos;inscription.
        </p>
      </header>

      <section className="container">
        <RiderOnboardingForm />
      </section>
    </main>
  );
}
