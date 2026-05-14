import { VendorOnboardingForm } from '@/features/vendor-onboarding/components/VendorOnboardingForm';

export const metadata = {
  title: 'Devenir vendeur — ChopNow',
  description:
    'Inscris ta cuisine sur ChopNow. Validation sous 24h. Gratuit. Commission seulement sur les commandes livrées.',
};

export default function VendrePage() {
  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Inscription vendeur
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Mets ta cuisine sur ChopNow</h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Gratuit. Validation sous 24h. Commission seulement quand on te livre une commande — pas de
          mensualité, pas de frais d&apos;inscription.
        </p>
      </header>

      <section className="container">
        <VendorOnboardingForm />
      </section>
    </main>
  );
}
