'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, Clock, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';
import { useVendorOrder } from '../hooks/useVendorOrder';
import type { VendorOrder } from '../hooks/useVendorOrders';
import { OrderStepper } from './OrderStepper';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

interface Props {
  orderId: string;
}

export function OrderPreparationScreen({ orderId }: Props) {
  const orderState = useVendorOrder(orderId);

  if (orderState.status === 'loading' || orderState.status === 'idle') {
    return (
      <Shell>
        <div className="mt-20 flex flex-col items-center gap-3">
          <div className="h-10 w-40 animate-pulse rounded-full bg-chop-surface-gray" />
          <div className="h-2 w-64 animate-pulse rounded bg-chop-surface-gray" />
          <div className="mt-6 h-32 w-full animate-pulse rounded-2xl bg-chop-surface-gray" />
        </div>
      </Shell>
    );
  }

  if (orderState.status === 'unauthenticated') {
    return (
      <Shell>
        <EmptyState
          title="Connexion requise"
          message="Connecte-toi pour gérer cette commande."
          ctaHref="/login?next=/vendor"
          ctaLabel="Se connecter"
        />
      </Shell>
    );
  }

  if (orderState.status === 'not_found') {
    return (
      <Shell>
        <EmptyState
          title="Commande introuvable"
          message="Elle a peut-être été annulée ou n'existe plus."
          ctaHref="/vendor"
          ctaLabel="Retour au dashboard"
        />
      </Shell>
    );
  }

  if (orderState.status === 'error') {
    return (
      <Shell>
        <EmptyState
          title="Erreur de chargement"
          message={orderState.message}
          ctaHref="/vendor"
          ctaLabel="Retour au dashboard"
        />
      </Shell>
    );
  }

  return <PreparationView order={orderState.order} reload={orderState.reload} />;
}

function PreparationView({ order, reload }: { order: VendorOrder; reload: () => void }) {
  // The preparation surface is intended for the kitchen workflow: ACCEPTED
  // / IN_PREP / READY_PICKUP. If the vendor lands here on an order that
  // hasn't been accepted yet (rare; would mean a stale link or out-of-band
  // status change), route them to the countdown screen instead — that's
  // where the accept/refuse decision lives.
  if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
    return (
      <Shell>
        <EmptyState
          title="Décision en attente"
          message="Cette commande n'est pas encore acceptée — passe par l'écran d'acceptation."
          ctaHref={`/vendor/commande/${order.id}`}
          ctaLabel="Aller à l'acceptation"
        />
      </Shell>
    );
  }

  // Terminal-after-pickup. The vendor's job is done at READY_PICKUP, but
  // we still want to show a useful page if they reload during the rider
  // hand-off window.
  if (
    order.status === 'PICKED_UP' ||
    order.status === 'DELIVERED' ||
    order.status === 'CANCELLED' ||
    order.status === 'REFUSED' ||
    order.status === 'EXPIRED'
  ) {
    return <DoneView order={order} />;
  }

  const isReady = order.status === 'READY_PICKUP';
  const allPrepared = order.items.length > 0 && order.items.every((i) => i.preparedAt !== null);
  const preparedCount = order.items.filter((i) => i.preparedAt !== null).length;

  return (
    <Shell>
      <BackBar />

      <header className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Commande
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight">{order.code}</h1>
          <p className="text-xs text-muted-foreground">{formatXAF(order.totalXAF)}</p>
        </div>
        <ElapsedTimer fromIso={order.acceptedAt} status={order.status} />
      </header>

      <OrderStepper className="mt-5" status={order.status} />

      {isReady ? (
        <PickupCodePanel order={order} />
      ) : (
        <PrepChecklistPanel order={order} preparedCount={preparedCount} onChange={reload} />
      )}

      <ReadyCta
        orderId={order.id}
        enabled={allPrepared && !isReady}
        isReady={isReady}
        onDone={reload}
        onError={(msg) => window.alert(msg)}
      />

      {/* Pre-order vendor cancel-after-accept (#187). Only shown for pre-orders
          (scheduledFor != null) in ACCEPTED/IN_PREP. Triggers a confirmation
          modal warning about the 10% penalty + consumer refund. Not shown on
          READY_PICKUP — once the order is ready for the rider, vendor cancel
          isn't allowed (the order is in the handover flow). */}
      {order.scheduledFor && !isReady ? <PreOrderCancelCta order={order} onDone={reload} /> : null}

      <Link
        href="/vendor"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-chop-card-white px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-chop-surface-gray"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Retour au dashboard
      </Link>
    </Shell>
  );
}

function PreOrderCancelCta({ order, onDone }: { order: VendorOrder; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Penalty preview — mirrors the backend rule (10% of totalXAF rounded down
  // to 50 FCFA). Server is authoritative; this is purely UX confirmation.
  const penalty = Math.floor((order.totalXAF * 0.1) / 50) * 50;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiRaw.patch(`/api/orders/${order.id}/vendor-cancel-preorder`, {
        note: note.trim() || undefined,
      });
      setOpen(false);
      onDone();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : (err as Error).message;
      setError(msg ?? 'Échec');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-full border border-chop-danger/40 bg-chop-danger-light px-4 py-3 text-sm font-semibold text-chop-danger transition-colors hover:bg-chop-danger/15"
      >
        Annuler cette pré-commande
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-chop-danger/40 bg-chop-danger-light p-4">
      <p className="text-sm font-bold text-chop-danger">Confirmer l&apos;annulation</p>
      <p className="mt-1 text-xs text-chop-ink">
        Le client sera remboursé intégralement. Une pénalité de{' '}
        <strong>{formatXAF(penalty)}</strong> (10% du total) sera prélevée sur ton prochain
        versement.
      </p>
      <label htmlFor="cancel-note" className="mt-3 block text-xs font-semibold">
        Raison (optionnel, vu par le client) :
      </label>
      <textarea
        id="cancel-note"
        rows={2}
        maxLength={200}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Pas de courant depuis 2h, impossible de finir."
        className="mt-1 w-full rounded-xl border border-divider bg-chop-card-white p-2 text-sm"
      />
      {error ? <p className="mt-2 text-xs text-chop-danger">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="flex-1 rounded-full border border-divider bg-chop-card-white px-4 py-2 text-sm font-semibold text-chop-ink-secondary hover:bg-chop-surface-gray disabled:opacity-50"
        >
          Garder la commande
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="flex-1 rounded-full bg-chop-danger px-4 py-2 text-sm font-bold text-white shadow-card hover:bg-chop-danger/90 disabled:opacity-50"
        >
          {busy ? '…' : `Annuler (-${formatXAF(penalty)})`}
        </button>
      </div>
    </div>
  );
}

function PrepChecklistPanel({
  order,
  preparedCount,
  onChange,
}: {
  order: VendorOrder;
  preparedCount: number;
  onChange: () => void;
}) {
  // Optimistic toggle: flip locally first, then call the API. If the call
  // fails, revert and surface the error. Without this the perceived lag on
  // a busy 3G connection makes the checklist feel broken.
  const [optimistic, setOptimistic] = React.useState<Record<string, boolean | undefined>>({});
  const [busy, setBusy] = React.useState<Set<string>>(new Set());

  const toggle = async (itemId: string, currentPrepared: boolean) => {
    if (busy.has(itemId)) return;
    const next = !currentPrepared;
    setOptimistic((m) => ({ ...m, [itemId]: next }));
    setBusy((s) => new Set(s).add(itemId));
    try {
      await apiRaw.patch(`/api/orders/${order.id}/items/${itemId}/prepared`, { prepared: next });
      onChange(); // pull authoritative state in the next tick
    } catch (err) {
      // Revert
      setOptimistic((m) => ({ ...m, [itemId]: currentPrepared }));
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : (err as Error).message;
      window.alert(msg ?? 'Échec de la mise à jour');
    } finally {
      setBusy((s) => {
        const next = new Set(s);
        next.delete(itemId);
        return next;
      });
    }
  };

  return (
    <section className="mt-5 rounded-2xl bg-chop-card-white p-4 shadow-card">
      <header className="flex items-center justify-between border-b border-divider pb-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Articles à préparer
        </p>
        <p className="font-mono text-xs font-semibold tabular-nums text-chop-ink">
          {preparedCount} / {order.items.length} prêts
        </p>
      </header>
      <ul className="mt-3 space-y-2">
        {order.items.map((line) => {
          const optimisticVal = optimistic[line.id];
          const isPrepared = optimisticVal !== undefined ? optimisticVal : line.preparedAt !== null;
          return (
            <li key={line.id}>
              <button
                type="button"
                onClick={() => toggle(line.id, isPrepared)}
                disabled={busy.has(line.id)}
                aria-pressed={isPrepared}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors disabled:opacity-50',
                  isPrepared
                    ? 'border-chop-mboue/30 bg-chop-mboue-light'
                    : 'border-divider hover:border-chop-red/40',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                    isPrepared ? 'border-chop-mboue bg-chop-mboue' : 'border-chop-neutral bg-white',
                  )}
                  aria-hidden
                >
                  {isPrepared ? <Check className="h-4 w-4 text-white" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    'flex-1 text-sm font-semibold',
                    isPrepared && 'text-chop-mboue line-through decoration-chop-mboue/40',
                  )}
                >
                  {line.nameSnapshot}
                </span>
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  ×{line.quantity}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <ProgressBar value={preparedCount} max={order.items.length} className="mt-4" />
    </section>
  );
}

function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-chop-surface-gray', className)}
    >
      <div
        className="h-full bg-chop-mboue transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}

function PickupCodePanel({ order }: { order: VendorOrder }) {
  return (
    <section className="mt-5 rounded-2xl bg-chop-card-white p-5 shadow-card">
      <div className="flex flex-col items-center text-center">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Code à donner au livreur
        </span>
        <p
          className="mt-2 font-mono text-5xl font-extrabold tracking-[0.25em] text-chop-red"
          aria-label={`Code pickup ${order.pickupCode ?? ''}`}
        >
          {order.pickupCode ?? '----'}
        </p>
        <p className="mt-3 max-w-xs text-xs text-muted-foreground">
          Le livreur a été notifié. Donne-lui ce code à la remise du sac pour confirmer la prise en
          charge.
        </p>
      </div>
    </section>
  );
}

function ReadyCta({
  orderId,
  enabled,
  isReady,
  onDone,
  onError,
}: {
  orderId: string;
  enabled: boolean;
  isReady: boolean;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = React.useState(false);

  if (isReady) {
    return (
      <div className="mt-5 rounded-2xl border border-chop-mboue/30 bg-chop-mboue-light p-4 text-center">
        <p className="text-sm font-bold text-chop-mboue">✅ Commande prête — livreur en route</p>
        <p className="mt-1 text-xs text-chop-mboue/80">
          Tu peux revenir au dashboard. On te ping quand la livraison est terminée.
        </p>
      </div>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await apiRaw.patch(`/api/orders/${orderId}/ready`, {});
      onDone();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : (err as Error).message;
      onError(msg ?? 'Échec');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      size="lg"
      disabled={!enabled || busy}
      onClick={submit}
      className="mt-5 w-full gap-2 bg-chop-red text-base shadow-card hover:bg-chop-red/90 disabled:opacity-50"
    >
      <ChefHat className="h-5 w-5" aria-hidden />
      {busy ? '…' : 'Commande prête — appeler livreur 🛵'}
    </Button>
  );
}

function ElapsedTimer({
  fromIso,
  status,
}: {
  fromIso: string | null;
  status: VendorOrder['status'];
}) {
  const fromMs = React.useMemo(() => (fromIso ? new Date(fromIso).getTime() : null), [fromIso]);
  const [now, setNow] = React.useState(() => Date.now());
  const isActive = status === 'ACCEPTED' || status === 'IN_PREP';

  React.useEffect(() => {
    if (!isActive) return; // freeze timer once ready
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isActive]);

  if (!fromMs || !isActive) return null;
  const elapsedSec = Math.max(0, Math.floor((now - fromMs) / 1000));
  const mm = Math.floor(elapsedSec / 60)
    .toString()
    .padStart(2, '0');
  const ss = (elapsedSec % 60).toString().padStart(2, '0');

  return (
    <div className="rounded-xl bg-chop-card-white px-3 py-2 text-right shadow-card">
      <p className="flex items-center justify-end gap-1 font-mono text-base font-bold tabular-nums text-chop-red">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {mm}:{ss}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        En préparation
      </p>
    </div>
  );
}

function DoneView({ order }: { order: VendorOrder }) {
  const headline =
    order.status === 'PICKED_UP'
      ? 'Livraison en cours'
      : order.status === 'DELIVERED'
        ? 'Livrée 🎉'
        : order.status === 'REFUSED' || order.status === 'EXPIRED'
          ? 'Commande refusée'
          : 'Commande annulée';
  return (
    <Shell>
      <BackBar />
      <div className="mt-12 flex flex-col items-center text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">{headline}</h1>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Cette commande n&apos;est plus dans la file d&apos;attente cuisine.
        </p>
      </div>
      <OrderStepper className="mt-8" status={order.status} />
      <Link
        href="/vendor"
        className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-chop-ink px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-chop-ink/90"
      >
        Retour au dashboard
      </Link>
    </Shell>
  );
}

function BackBar() {
  return (
    <Link
      href="/vendor"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-chop-card-white text-chop-ink shadow-card transition-colors hover:bg-chop-surface-gray"
      aria-label="Retour au dashboard"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Same full-screen takeover pattern as OrderAcceptanceScreen — the vendor's
  // attention should be on the kitchen workflow, not the surrounding chrome.
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-chop-surface-gray">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-5">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
