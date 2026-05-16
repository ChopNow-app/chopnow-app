'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { useOrder, type OrderView } from '../hooks/useOrder';
import { OrderTimeline } from './OrderTimeline';
import { RatingForm } from './RatingForm';

const RATING_WINDOW_MS = 24 * 60 * 60 * 1000;

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function OrderTrackingPage({ orderId }: { orderId: string }) {
  const state = useOrder(orderId);

  if (state.status === 'idle' || state.status === 'loading') return <Skeleton />;
  if (state.status === 'unauthenticated') return <AuthRequired orderId={orderId} />;
  if (state.status === 'not_found') {
    return (
      <main className="container py-16 text-center">
        <h1 className="text-xl font-bold">Commande introuvable</h1>
        <Button asChild className="mt-6">
          <Link href="/restaurants">Retour</Link>
        </Button>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container py-16 text-center">
        <p className="text-destructive">{state.message}</p>
        <Button variant="outline" className="mt-4" onClick={state.reload}>
          Réessayer
        </Button>
      </main>
    );
  }

  return <OrderContent order={state.order} onReload={state.reload} />;
}

function OrderContent({ order, onReload }: { order: OrderView; onReload: () => void }) {
  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED';

  const onCancel = async () => {
    if (!window.confirm('Annuler cette commande ? Cette action est irréversible.')) return;
    try {
      await apiRaw.patch(`/api/orders/${order.id}/cancel`, {});
      onReload();
    } catch (err) {
      const msg = err instanceof ApiClientError ? `Erreur ${err.status}` : (err as Error).message;
      window.alert(`Annulation échouée : ${msg}`);
    }
  };

  return (
    <main className="min-h-dvh bg-chop-warm pb-16 text-chop-ink">
      <header className="container py-4">
        <Link href="/restaurants" className="text-sm text-muted-foreground">
          ← Tous les vendeurs
        </Link>
      </header>

      <section className="container space-y-4 py-2">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Commande</p>
            <h1 className="font-mono text-2xl font-extrabold">{order.code}</h1>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onReload}>
            Actualiser
          </Button>
        </header>

        <p className="text-sm text-muted-foreground">
          {/^chez\b/i.test(order.vendor.name) ? null : 'Chez '}
          <span className="font-semibold">{order.vendor.name}</span>
        </p>
      </section>

      <section className="container mt-6">
        <OrderTimeline order={order} />
      </section>

      <NoRiderAvailableBlock order={order} />

      <DeliveryCodeBlock order={order} />

      <RatingSection order={order} onSubmitted={onReload} />

      <section className="container mt-8 space-y-4">
        <h2 className="text-lg font-bold">Détails</h2>

        <ul className="space-y-2 rounded-lg border bg-background p-3 text-sm">
          {order.items.map((line) => (
            <li key={line.id} className="flex justify-between">
              <span className="min-w-0 truncate">
                {line.quantity} × {line.nameSnapshot}
              </span>
              <span className="shrink-0 font-mono">{formatXAF(line.lineXAF)}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-mono">{formatXAF(order.subtotalXAF)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Livraison</span>
            <span className="font-mono">{formatXAF(order.deliveryFeeXAF)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span className="font-mono">{formatXAF(order.totalXAF)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {labelForPayment(order.paymentMethod)} ·{' '}
            <PaymentStatusBadge status={order.paymentStatus} />
          </p>
        </div>

        <div className="rounded-lg border bg-background p-3 text-sm">
          <p className="font-semibold">Adresse de livraison</p>
          <p className="mt-0.5 text-muted-foreground">📍 {order.deliveryQuartier}</p>
          {order.deliveryLandmark ? (
            <p className="text-muted-foreground">{order.deliveryLandmark}</p>
          ) : null}
          {order.deliveryDescription ? (
            <p className="mt-1 text-xs text-muted-foreground">{order.deliveryDescription}</p>
          ) : null}
        </div>

        {order.noteForVendor ? (
          <div className="rounded-lg border bg-background p-3 text-sm">
            <p className="font-semibold">Note au vendeur</p>
            <p className="mt-0.5 text-muted-foreground">{order.noteForVendor}</p>
          </div>
        ) : null}

        {canCancel ? (
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            Annuler la commande
          </Button>
        ) : null}
      </section>
    </main>
  );
}

/**
 * Story 4.14 — terminal "no rider available" state. When dispatch retried
 * 10× over 5 minutes without finding an online rider, the backend marks
 * the order EXPIRED with refusalReason=NO_RIDER_AVAILABLE. Show the
 * consumer a clear terminal block + the refund / re-order CTA. MoMo
 * orders auto-refund (paymentStatus=REFUNDED); CASH orders just close.
 */
function NoRiderAvailableBlock({ order }: { order: OrderView }) {
  if (order.status !== 'EXPIRED' || order.refusalReason !== 'NO_RIDER_AVAILABLE') return null;
  const isPaidMomo = order.paymentStatus === 'REFUNDED';
  return (
    <section className="container mt-6">
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-base font-bold">😔 Aucun livreur disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          On n&apos;a pas trouvé de livreur libre dans ta zone. La commande a été annulée
          automatiquement.
        </p>
        {isPaidMomo ? (
          <p className="mt-2 text-sm">
            ✅ Ton paiement MoMo a été remboursé — tu le verras sur ton compte sous 24h.
          </p>
        ) : (
          <p className="mt-2 text-sm">
            ✅ Aucun montant n&apos;a été prélevé (paiement à la livraison).
          </p>
        )}
        <Button asChild className="mt-4 w-full">
          <Link href="/restaurants">Choisir un autre vendeur</Link>
        </Button>
      </div>
    </section>
  );
}

/**
 * Story 4.13 — show the consumer their 4-digit delivery code. The rider
 * must read this off the consumer at drop-off and submit it; this prevents
 * a rider from marking "Livré" without actually delivering. Hidden once
 * the order is DELIVERED (no longer useful) or for terminal-failure states.
 */
function DeliveryCodeBlock({ order }: { order: OrderView }) {
  const SHOW_FOR: ReadonlySet<OrderView['status']> = new Set([
    'CONFIRMED',
    'ACCEPTED',
    'IN_PREP',
    'READY_PICKUP',
    'PICKED_UP',
  ]);
  if (!SHOW_FOR.has(order.status) || !order.deliveryCode) return null;
  return (
    <section className="container mt-6">
      <div className="bg-card rounded-lg border-2 border-chop-red p-4 text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Code de livraison</p>
        <p className="mt-2 font-mono text-5xl font-extrabold tracking-widest text-chop-red">
          {order.deliveryCode}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Donne ce code au livreur à la livraison. Il ne pourra clôturer la course qu&apos;avec ce
          code.
        </p>
      </div>
    </section>
  );
}

function RatingSection({ order, onSubmitted }: { order: OrderView; onSubmitted: () => void }) {
  // Capture "now" at first render to satisfy React 19's purity rule on Date.now.
  // If the user lingers past 24h with the page open, the backend still rejects
  // the submit with rating_window_expired and we surface that.
  const [nowAtMount] = React.useState(() => Date.now());

  if (order.status !== 'DELIVERED') return null;

  if (order.rating) {
    return (
      <section className="container mt-6">
        <div className="bg-card rounded-lg border p-4 text-sm">
          <p className="font-semibold">⭐ Tu as déjà noté cette commande</p>
          <p className="mt-1 text-muted-foreground">
            Vendeur : {order.rating.vendorScore}/5 · Livreur : {order.rating.riderScore}/5
          </p>
        </div>
      </section>
    );
  }

  if (order.deliveredAt) {
    const elapsedMs = nowAtMount - new Date(order.deliveredAt).getTime();
    if (elapsedMs > RATING_WINDOW_MS) return null;
  }

  return (
    <section className="container mt-6">
      <RatingForm orderId={order.id} vendorName={order.vendor.name} onSubmitted={onSubmitted} />
    </section>
  );
}

function labelForPayment(m: OrderView['paymentMethod']): string {
  if (m === 'MTN_MOMO') return 'MTN MoMo';
  if (m === 'ORANGE_MONEY') return 'Orange Money';
  return 'Cash à la livraison';
}

function PaymentStatusBadge({ status }: { status: OrderView['paymentStatus'] }) {
  const label =
    status === 'PAID'
      ? 'Payé ✅'
      : status === 'PROCESSING'
        ? 'Paiement en cours…'
        : status === 'FAILED'
          ? 'Paiement échoué'
          : status === 'REFUNDED'
            ? 'Remboursé'
            : 'En attente';
  return <span>{label}</span>;
}

function Skeleton() {
  return (
    <main className="min-h-dvh bg-chop-warm p-4">
      <div className="container space-y-3">
        <div className="h-12 animate-pulse rounded-lg bg-background" />
        <div className="h-64 animate-pulse rounded-lg bg-background" />
        <div className="h-32 animate-pulse rounded-lg bg-background" />
      </div>
    </main>
  );
}

function AuthRequired({ orderId }: { orderId: string }) {
  return (
    <main className="container py-16 text-center">
      <h1 className="text-xl font-bold">Connexion requise</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Connecte-toi pour voir le suivi de ta commande.
      </p>
      <Button asChild className="mt-6">
        <Link href={`/login?next=/orders/${orderId}`}>Se connecter</Link>
      </Button>
    </main>
  );
}
