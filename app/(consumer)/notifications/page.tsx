'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, ChevronLeft, Check, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { usePushSubscription } from '@/features/vendor/hooks/usePushSubscription';

/**
 * Consumer notifications surface — landing target for the bell icon in
 * the catalogue HomeHeader.
 *
 * Right now there is no per-user notification feed in the DB; this page
 * is a stub that does three honest things:
 *   1. Surfaces the push-notification subscription state + a one-tap
 *      enable button (reusing the existing `usePushSubscription` hook
 *      built for the vendor surface — the hook is feature-agnostic).
 *   2. Empty state for the future in-app notification feed.
 *   3. Deep-link to /orders, which is what consumers will care about
 *      most — order status updates are the #1 notification they'll get
 *      once push delivery is wired through the order lifecycle worker.
 *
 * When a per-user notification feed lands, replace the EmptyState block
 * with a TanStack-query-backed list. The header + push toggle stay.
 */
export default function NotificationsPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const push = usePushSubscription();

  // Soft auth gate: if anonymous, send them through login so the push
  // subscription is attached to a user account.
  React.useEffect(() => {
    if (user.status === 'anonymous') {
      router.replace('/login?next=/notifications');
    }
  }, [user.status, router]);

  if (user.status === 'loading' || user.status === 'anonymous') {
    return (
      <main className="min-h-dvh bg-chop-warm">
        <div className="container max-w-md py-16 text-center text-sm text-chop-ink-secondary md:max-w-2xl">
          Chargement…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container max-w-md px-5 pt-5 md:max-w-2xl md:px-8">
        <Link
          href="/restaurants"
          aria-label="Retour"
          className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-chop-ink transition-colors hover:bg-chop-surface-gray"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
        </Link>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Notifications</h1>
        <p className="mt-1 text-sm text-chop-ink-secondary">
          Reçois les mises à jour de tes commandes en temps réel — même quand l&apos;app est fermée.
        </p>
      </header>

      <section className="container mt-6 max-w-md space-y-4 px-5 md:max-w-2xl md:px-8">
        <PushSubscriptionCard state={push.state} onEnable={push.request} />
        <NotificationFeedEmptyState />
        <OrdersDeepLink />
      </section>
    </main>
  );
}

/* ---------------------- Push subscription card ---------------------- */

function PushSubscriptionCard({
  state,
  onEnable,
}: {
  state: ReturnType<typeof usePushSubscription>['state'];
  onEnable: () => void | Promise<void>;
}) {
  // Map the discriminated-union state to the visible UI. Each branch sets
  // its own icon, copy, and CTA (or absence of CTA) so the component is
  // a pure switch — no shared mutable variables.
  if (state.status === 'subscribed') {
    return (
      <Card>
        <CardIcon variant="success">
          <Check className="h-5 w-5" strokeWidth={2.4} />
        </CardIcon>
        <div className="flex-1">
          <h2 className="text-base font-bold">Notifications activées</h2>
          <p className="mt-1 text-sm text-chop-ink-secondary">
            Tu seras prévenu·e quand un livreur prend ta commande et quand il arrive.
          </p>
        </div>
      </Card>
    );
  }

  if (state.status === 'unsupported') {
    return (
      <Card>
        <CardIcon variant="muted">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </CardIcon>
        <div className="flex-1">
          <h2 className="text-base font-bold">Notifications non disponibles</h2>
          <p className="mt-1 text-sm text-chop-ink-secondary">
            Ton navigateur ne supporte pas les notifications push. Ouvre Tchop NoW sur Chrome ou
            Safari pour les recevoir.
          </p>
        </div>
      </Card>
    );
  }

  if (state.status === 'denied') {
    return (
      <Card>
        <CardIcon variant="muted">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </CardIcon>
        <div className="flex-1">
          <h2 className="text-base font-bold">Notifications bloquées</h2>
          <p className="mt-1 text-sm text-chop-ink-secondary">
            Tu as refusé les notifications. Réactive-les dans les paramètres du navigateur (icône
            cadenas dans la barre d&apos;adresse).
          </p>
        </div>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card>
        <CardIcon variant="muted">
          <Bell className="h-5 w-5" strokeWidth={2.2} />
        </CardIcon>
        <div className="flex-1">
          <h2 className="text-base font-bold">Activation impossible</h2>
          <p className="mt-1 text-sm text-chop-ink-secondary">{state.message}</p>
          <Button onClick={onEnable} className="mt-3" size="sm">
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  // 'idle' | 'prompt' | 'subscribing' — show the enable CTA.
  const submitting = state.status === 'subscribing';
  return (
    <Card>
      <CardIcon variant="brand">
        <BellRing className="h-5 w-5" strokeWidth={2.2} />
      </CardIcon>
      <div className="flex-1">
        <h2 className="text-base font-bold">Active les notifications</h2>
        <p className="mt-1 text-sm text-chop-ink-secondary">
          Pour savoir dès que ton livreur arrive — pas besoin de garder l&apos;app ouverte.
        </p>
        <Button onClick={onEnable} disabled={submitting} className="mt-3" size="sm">
          {submitting ? 'Activation…' : 'Activer'}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------------- Notification feed (empty for now) ---------------------- */

function NotificationFeedEmptyState() {
  return (
    <EmptyState
      icon="🔔"
      title="Pas encore de notifications"
      body="Quand tu auras une commande en cours, ses mises à jour apparaîtront ici."
    />
  );
}

/* ---------------------- Deep link to orders ---------------------- */

function OrdersDeepLink() {
  return (
    <Link
      href="/orders"
      className="group flex items-center justify-between gap-3 rounded-3xl border border-divider bg-chop-card-white p-5 shadow-card transition-colors hover:border-chop-ink"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-chop-ink-secondary">
          Tu cherches une commande&nbsp;?
        </p>
        <p className="mt-1.5 text-base font-bold">Voir mes commandes</p>
        <p className="mt-0.5 text-sm text-chop-ink-secondary">
          Statut, code de retrait, et bouton d&apos;appel du livreur.
        </p>
      </div>
      <ExternalLink
        className="h-5 w-5 shrink-0 text-chop-ink-secondary transition-transform group-hover:translate-x-0.5"
        strokeWidth={2}
        aria-hidden
      />
    </Link>
  );
}

/* ---------------------- Tiny shared primitives ---------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-3xl border border-divider bg-chop-card-white p-5 shadow-card">
      {children}
    </div>
  );
}

function CardIcon({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: 'brand' | 'success' | 'muted';
}) {
  const cls =
    variant === 'success'
      ? 'bg-chop-mboue-light text-chop-mboue'
      : variant === 'muted'
        ? 'bg-chop-surface-gray text-chop-ink-secondary'
        : 'bg-chop-red text-white';
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cls}`}>
      {children}
    </div>
  );
}
