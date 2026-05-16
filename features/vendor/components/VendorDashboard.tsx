'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/api-client';
import { cn } from '@/lib/utils';
import { useVendorAvailability } from '../hooks/useVendorAvailability';
import { useVendorOrders, type VendorOrder } from '../hooks/useVendorOrders';
import { useMenuItems, type MenuItem } from '../hooks/useMenuItems';
import { MenuItemEditor } from './MenuItemEditor';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function VendorDashboard() {
  const availability = useVendorAvailability();
  const orders = useVendorOrders();
  const menu = useMenuItems();
  const [editing, setEditing] = React.useState<
    { kind: 'new' } | { kind: 'edit'; item: MenuItem } | null
  >(null);

  if (orders.status === 'unauthenticated' || availability.status === 'unauthenticated') {
    return (
      <div className="bg-card rounded-lg border p-6 text-center">
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <Button asChild className="mt-4">
          <Link href="/login?next=/vendor">Se connecter</Link>
        </Button>
      </div>
    );
  }

  const pendingDecision =
    orders.status === 'ready'
      ? orders.orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED')
      : [];
  const inFlight =
    orders.status === 'ready'
      ? orders.orders.filter((o) =>
          ['ACCEPTED', 'IN_PREP', 'READY_PICKUP', 'PICKED_UP'].includes(o.status),
        )
      : [];

  return (
    <div className="space-y-4">
      <AvailabilitySection state={availability} />

      <section>
        <header className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            À décider
            {pendingDecision.length > 0 ? (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-chop-red px-1.5 text-xs font-bold text-white">
                {pendingDecision.length}
              </span>
            ) : null}
          </h2>
          {orders.status === 'ready' ? (
            <button
              type="button"
              onClick={orders.reload}
              className="text-xs font-semibold text-chop-red hover:underline"
            >
              ↻ Actualiser
            </button>
          ) : null}
        </header>
        {orders.status === 'loading' || orders.status === 'idle' ? (
          <SkeletonList />
        ) : orders.status === 'error' ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {orders.message}
          </p>
        ) : pendingDecision.length === 0 ? (
          <p className="rounded-xl bg-chop-card-white p-4 text-sm text-muted-foreground shadow-card">
            Aucune commande en attente. Tu seras notifié(e) à la prochaine.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendingDecision.map((o) => (
              <li key={o.id}>
                <OrderInboxCard order={o} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {inFlight.length > 0 ? (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-base font-extrabold">
            En cours
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-chop-mboue px-1.5 text-xs font-bold text-white">
              {inFlight.length}
            </span>
          </h2>
          <ul className="space-y-3">
            {inFlight.map((o) => (
              <li key={o.id}>
                <ActiveOrderCard order={o} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Menu</h2>
          {menu.status === 'ready' ? (
            <Button type="button" size="sm" onClick={() => setEditing({ kind: 'new' })}>
              + Ajouter un plat
            </Button>
          ) : null}
        </header>
        {menu.status === 'loading' || menu.status === 'idle' ? (
          <SkeletonList />
        ) : menu.status === 'error' ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            {menu.message}
          </p>
        ) : menu.status === 'ready' ? (
          menu.items.length === 0 ? (
            <p className="bg-card rounded-lg border p-4 text-sm text-muted-foreground">
              Aucun plat. Clique sur « + Ajouter un plat » pour commencer.
            </p>
          ) : (
            <ul className="space-y-2">
              {menu.items.map((item) => (
                <li key={item.id}>
                  <MenuItemRow
                    item={item}
                    onToggleStock={menu.setInStock}
                    onEdit={() => setEditing({ kind: 'edit', item })}
                    onDelete={async () => {
                      if (!window.confirm(`Supprimer « ${item.name} » ?`)) return;
                      try {
                        await menu.deleteItem(item.id);
                      } catch (err) {
                        window.alert(extract(err) ?? 'Suppression échouée');
                      }
                    }}
                  />
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>

      {editing && menu.status === 'ready' ? (
        <MenuItemEditor
          initial={editing.kind === 'edit' ? editing.item : undefined}
          onSave={(input) =>
            editing.kind === 'edit'
              ? menu.updateItem(editing.item.id, input)
              : menu.createItem(input)
          }
          onUploadPhoto={menu.uploadPhoto}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

function AvailabilitySection({ state }: { state: ReturnType<typeof useVendorAvailability> }) {
  if (state.status === 'loading' || state.status === 'idle') {
    return <div className="bg-card h-24 animate-pulse rounded-lg border" />;
  }
  if (state.status === 'error') {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        Statut indisponible — {state.message}
      </div>
    );
  }
  if (state.status === 'unauthenticated') return null;

  return (
    <section className="bg-card rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Statut</p>
          <p className="mt-1 text-xl font-bold">
            {state.data.isOpenNow ? '🟢 Ouvert' : '⚪ Fermé'}
          </p>
          <p className="text-xs text-muted-foreground">
            {state.data.isOpen
              ? 'Toggle activé — les clients voient ton profil dans le catalogue.'
              : 'Toggle désactivé — invisible dans le catalogue.'}
          </p>
        </div>
        <Button
          type="button"
          disabled={state.saving}
          onClick={() => state.setOpen(!state.data.isOpen)}
          variant={state.data.isOpen ? 'outline' : 'default'}
        >
          {state.saving ? '…' : state.data.isOpen ? 'Fermer' : 'Ouvrir'}
        </Button>
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
    </section>
  );
}

function OrderInboxCard({ order }: { order: VendorOrder }) {
  // Decision now lives on /vendor/commande/[id] (full-screen with countdown).
  // The dashboard card is purely a preview that routes the vendor into the
  // decision flow — one Link, one tap. Reduces tap-target ambiguity in a
  // busy kitchen ("did I just accept or refuse?") and gives the countdown
  // its own surface where it dominates the viewport.
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <Link
      href={`/vendor/commande/${order.id}`}
      className="group flex items-stretch gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card transition-shadow hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {order.code}
          </p>
          <span className="shrink-0 rounded-full bg-chop-red-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-chop-red">
            À décider
          </span>
        </div>
        <p className="mt-1 text-lg font-extrabold tabular-nums">{formatXAF(order.totalXAF)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {itemCount} plat{itemCount > 1 ? 's' : ''} · {labelForPayment(order.paymentMethod)} · 📍{' '}
          {order.deliveryQuartier}
        </p>
      </div>
      <div className="flex items-center pl-1">
        <ChevronRight
          className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function ActiveOrderCard({ order }: { order: VendorOrder }) {
  // The pickup-code panel + the checklist now both live on /vendor/preparation.
  // The dashboard card is a preview that routes there in one tap. Keeps the
  // dashboard scannable when there are several in-flight orders at once.
  const preparedCount = order.items.filter((i) => i.preparedAt !== null).length;
  return (
    <Link
      href={`/vendor/preparation/${order.id}`}
      className="group flex items-stretch gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card transition-shadow hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {order.code}
          </p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
              order.status === 'READY_PICKUP'
                ? 'bg-chop-mboue-light text-chop-mboue'
                : 'bg-chop-red-light text-chop-red',
            )}
          >
            {labelForActiveStatus(order.status)}
          </span>
        </div>
        <p className="mt-1 text-lg font-extrabold tabular-nums">{formatXAF(order.totalXAF)}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {order.items.length} plat{order.items.length > 1 ? 's' : ''}
          {order.status === 'IN_PREP' || order.status === 'ACCEPTED'
            ? ` · ${preparedCount}/${order.items.length} prêts`
            : ''}
        </p>
      </div>
      <div className="flex items-center pl-1">
        <ChevronRight
          className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
    </Link>
  );
}

function MenuItemRow({
  item,
  onToggleStock,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
  onToggleStock: (id: string, inStock: boolean) => Promise<void>;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div
      className={`bg-card flex items-center gap-3 rounded-lg border p-3 ${
        !item.isInStock ? 'opacity-60' : ''
      }`}
    >
      {item.photoUrl ? (
        <img
          src={item.photoUrl}
          alt={item.name}
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
          —
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatXAF(item.priceXAF)}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          type="button"
          variant={item.isInStock ? 'outline' : 'default'}
          size="sm"
          onClick={() => onToggleStock(item.id, !item.isInStock)}
        >
          {item.isInStock ? '✓ Dispo' : '× Épuisé'}
        </Button>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="sm" onClick={onEdit} aria-label="Modifier">
            ✏️
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDelete}
            aria-label="Supprimer"
          >
            🗑
          </Button>
        </div>
      </div>
    </div>
  );
}

function labelForPayment(m: VendorOrder['paymentMethod']): string {
  if (m === 'CASH') return 'Cash';
  if (m === 'MTN_MOMO') return 'MTN MoMo';
  return 'Orange Money';
}

function labelForActiveStatus(s: VendorOrder['status']): string {
  switch (s) {
    case 'ACCEPTED':
      return 'Acceptée';
    case 'IN_PREP':
      return 'En préparation';
    case 'READY_PICKUP':
      return 'Prête';
    case 'PICKED_UP':
      return 'Livraison en cours';
    default:
      return s;
  }
}

function extract(err: unknown): string | null {
  if (err instanceof ApiClientError) {
    const body = err.body as { message?: string } | undefined;
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? null;
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-chop-card-white shadow-card" />
      ))}
    </div>
  );
}
