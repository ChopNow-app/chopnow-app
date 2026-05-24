import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Branded 404 page (Next.js App Router convention). Renders when a route
 * resolves to no match — typo URLs, stale links from old SMS / WhatsApp
 * shares, deleted orders, etc.
 *
 * The previous behavior fell back to Next.js's default 404 chrome (black
 * text on white with "This page could not be found"). This brand-matched
 * version gives users an explicit recovery path back to /restaurants.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-chop-warm px-5 text-center text-chop-ink">
      <div className="max-w-sm">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-chop-red">— 404</p>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight">
          Page introuvable
        </h1>
        <p className="mt-2 text-sm text-chop-ink-secondary">
          Le lien est peut-être ancien, ou la commande n&apos;existe plus. Reviens à l&apos;accueil
          pour repartir.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/restaurants">Voir les restaurants</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/orders">Mes commandes</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
