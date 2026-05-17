'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVendorAvailability } from '../hooks/useVendorAvailability';
import { useVendorOrders, type VendorOrder } from '../hooks/useVendorOrders';
import { useMenuItems } from '../hooks/useMenuItems';
import { VendorPushPermissionBanner } from './VendorPushPermissionBanner';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function VendorDashboard() {
  const availability = useVendorAvailability();
  const orders = useVendorOrders();
  const menu = useMenuItems();

  // Sub-second reaction to incoming orders. The service worker fires a
  // postMessage on every push event; when the kind is ORDER_CREATED we
  // refresh the order list immediately (don't wait for the 10s poll) and
  // play a short two-tone chime so the kitchen hears it over background
  // noise.
  //
  // Audio uses Web Audio API rather than a static MP3 to avoid shipping
  // an asset; trade-off is a slightly less polished sound that we can
  // swap later by pointing this at /sounds/new-order.mp3.
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      const payload = event.data as { source?: string; data?: { kind?: string } } | undefined;
      if (payload?.source !== 'push') return;
      if (payload.data?.kind !== 'ORDER_CREATED') return;
      playChime();
      if (orders.status === 'ready') orders.reload();
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [orders]);

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
      <VendorPushPermissionBanner />
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

      <Link
        href="/vendor/menu"
        className="group flex items-center justify-between gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card transition-shadow hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
      >
        <div className="min-w-0">
          <p className="text-base font-extrabold">Mon menu</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {menu.status === 'ready'
              ? `${menu.items.length} ${menu.items.length === 1 ? 'plat' : 'plats'} · gérer disponibilité, prix, photos`
              : 'Gérer mes plats'}
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>

      <Link
        href="/vendor/hours"
        className="group flex items-center justify-between gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card transition-shadow hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
      >
        <div className="min-w-0">
          <p className="text-base font-extrabold">Mes horaires</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Définir les jours et heures d&apos;ouverture
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>

      <Link
        href="/vendor/profile"
        className="group flex items-center justify-between gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card transition-shadow hover:shadow-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
      >
        <div className="min-w-0">
          <p className="text-base font-extrabold">Mon profil</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Modifier nom, description, photos, MoMo
          </p>
        </div>
        <ChevronRight
          className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
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

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-chop-card-white shadow-card" />
      ))}
    </div>
  );
}

// Two-tone synth chime via Web Audio. Survives autoplay restrictions because
// it only runs after a user-driven push event reaches an interactive client.
function playChime(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [
      { freq: 880, start: 0, duration: 0.14 },
      { freq: 1320, start: 0.16, duration: 0.18 },
    ].forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 800);
  } catch {
    // No-op — chime is decorative.
  }
}
