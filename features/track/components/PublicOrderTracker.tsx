'use client';

import * as React from 'react';
import Link from 'next/link';
import { fetchPublicOrder, type PublicOrderStatus, type PublicOrderView } from '../api';

// Poll while order is active so the page updates without manual refresh.
const POLL_INTERVAL_MS = 30_000;

// Step-by-step lifecycle the visitor can see. Order matters — first row is
// "earliest"; reached() decides which steps to highlight.
interface Step {
  key: string;
  label: string;
  icon: string;
  reached: (s: PublicOrderStatus) => boolean;
  timestamp: (o: PublicOrderView) => string | null;
}

const ACTIVE_STATUSES: ReadonlySet<PublicOrderStatus> = new Set<PublicOrderStatus>([
  'PENDING',
  'CONFIRMED',
  'ACCEPTED',
  'IN_PREP',
  'READY_PICKUP',
  'PICKED_UP',
]);

const TERMINAL_LABELS: Partial<Record<PublicOrderStatus, { label: string; tone: 'ok' | 'bad' }>> = {
  DELIVERED: { label: 'Livrée 🎉', tone: 'ok' },
  CANCELLED: { label: 'Annulée', tone: 'bad' },
  REFUSED: { label: 'Refusée par le vendeur', tone: 'bad' },
  EXPIRED: { label: 'Expirée (vendeur n’a pas répondu)', tone: 'bad' },
};

const STEPS: Step[] = [
  {
    key: 'placed',
    label: 'Commande envoyée',
    icon: '📝',
    reached: () => true,
    timestamp: (o) => o.placedAt,
  },
  {
    key: 'accepted',
    label: 'Vendeur a accepté',
    icon: '✅',
    reached: (s) =>
      s === 'ACCEPTED' ||
      s === 'IN_PREP' ||
      s === 'READY_PICKUP' ||
      s === 'PICKED_UP' ||
      s === 'DELIVERED',
    timestamp: (o) => o.acceptedAt,
  },
  {
    key: 'prepared',
    label: 'Préparation terminée',
    icon: '👨‍🍳',
    reached: (s) => s === 'READY_PICKUP' || s === 'PICKED_UP' || s === 'DELIVERED',
    timestamp: (o) => o.preparedAt,
  },
  {
    key: 'picked_up',
    label: 'Livreur en route',
    icon: '🛵',
    reached: (s) => s === 'PICKED_UP' || s === 'DELIVERED',
    timestamp: (o) => o.pickedUpAt,
  },
  {
    key: 'delivered',
    label: 'Livrée',
    icon: '🏠',
    reached: (s) => s === 'DELIVERED',
    timestamp: (o) => o.deliveredAt,
  },
];

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; order: PublicOrderView }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

export function PublicOrderTracker({ orderId }: { orderId: string }) {
  const [state, setState] = React.useState<State>({ status: 'loading' });

  const load = React.useCallback(async () => {
    try {
      const order = await fetchPublicOrder(orderId);
      setState({ status: 'ready', order });
      return order;
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'not_found') {
        setState({ status: 'not_found' });
      } else {
        setState({ status: 'error', message: (err as Error).message });
      }
      return null;
    }
  }, [orderId]);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const order = await load();
      if (cancelled) return;
      // Keep polling while the order is still in flight; stop once terminal.
      if (order && ACTIVE_STATUSES.has(order.status)) {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  if (state.status === 'loading') {
    return (
      <main className="container max-w-md py-16 text-center">
        <p className="text-sm text-muted-foreground">Chargement de la commande…</p>
      </main>
    );
  }

  if (state.status === 'not_found') {
    return (
      <main className="container max-w-md py-16 text-center">
        <h1 className="text-xl font-bold">Commande introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le lien est peut-être incorrect ou la commande a été supprimée.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-chop-red px-4 py-2 text-sm font-semibold text-white"
        >
          Retour à l&apos;accueil
        </Link>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="container max-w-md py-16 text-center">
        <p className="text-destructive">Erreur : {state.message}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-md border px-4 py-2 text-sm font-semibold"
        >
          Réessayer
        </button>
      </main>
    );
  }

  const o = state.order;
  const terminal = TERMINAL_LABELS[o.status];

  return (
    <main className="container max-w-md py-8 md:max-w-3xl">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-chop-red">
          Suivi de commande
        </p>
        <h1 className="mt-1 text-2xl font-extrabold">{o.vendor.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">Réf {o.code}</p>
      </header>

      {terminal ? (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-center text-sm font-semibold ${
            terminal.tone === 'ok'
              ? 'border-mboue-green bg-mboue-green/10 text-mboue-green'
              : 'border-destructive bg-destructive/10 text-destructive'
          }`}
        >
          {terminal.label}
        </div>
      ) : null}

      <ol className="space-y-3">
        {STEPS.map((step) => {
          const reached = step.reached(o.status);
          const ts = formatTime(step.timestamp(o));
          return (
            <li
              key={step.key}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                reached ? 'border-chop-red bg-background' : 'border-border bg-muted/30 opacity-60'
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {step.icon}
              </span>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${reached ? '' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                {reached && ts ? <p className="text-xs text-muted-foreground">{ts}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="mt-8 space-y-2 text-center text-xs text-muted-foreground">
        <p>
          Page partageable — envoie ce lien à un ami pour qu&apos;il puisse suivre la commande sans
          se connecter.
        </p>
        <p>Mise à jour automatique toutes les 30 secondes.</p>
      </footer>
    </main>
  );
}
