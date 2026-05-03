import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <header className="container flex items-center justify-between py-4">
        <span className="text-xl font-extrabold uppercase tracking-tight">ChopNow</span>
        <PwaInstallPrompt />
      </header>

      <section className="container flex flex-col gap-6 py-16 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-widest text-chop-orange">
          Douala · Cameroun
        </p>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-6xl">Mange sans attendre.</h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          De la rue à ta porte. Commande tes plats préférés auprès des vendeurs autour de toi —
          livré à moto en 30 minutes.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <Button asChild size="lg">
            <Link href="/restaurants">Commander maintenant</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Se connecter</Link>
          </Button>
        </div>

        <nav className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/livreur"
            className="rounded-lg border bg-background p-4 text-sm hover:bg-accent"
          >
            <span className="block font-semibold">Espace Livreur →</span>
            <span className="text-muted-foreground">Recevoir des courses</span>
          </Link>
          <Link
            href="/vendor"
            className="rounded-lg border bg-background p-4 text-sm hover:bg-accent"
          >
            <span className="block font-semibold">Espace Vendeur →</span>
            <span className="text-muted-foreground">Gérer mon catalogue</span>
          </Link>
          <Link
            href="/admin"
            className="rounded-lg border bg-background p-4 text-sm hover:bg-accent"
          >
            <span className="block font-semibold">Admin →</span>
            <span className="text-muted-foreground">Console opérations</span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
