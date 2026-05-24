'use client';

// React 19's react-hooks/set-state-in-effect rule trips the standard
// fetch-on-mount pattern this hook uses. Same precedent as useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import { AuthRequired } from '@/components/ui/auth-required';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '../hooks/useOrder';
import { ConsumerPushPermissionBanner } from './ConsumerPushPermissionBanner';

// Mirrors the backend's OrderListItem shape — narrow to fields this page
// actually renders. Replace with an openapi-generated type once the
// /api/orders response schema is decorated with @ApiResponse.
interface OrderListItem {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalXAF: number;
  vendor: { id: string; name: string };
  items: Array<{ id: string; nameSnapshot: string; quantity: number }>;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; orders: OrderListItem[] }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

// Story 3.6 — consumer order history. Auth-gated at the component level so
// the same /orders URL works whether the user is logged in or not (returns
// a "Connecte-toi" panel on 401 instead of a Next.js 404, which was
// surfacing in Lighthouse as a prefetch error).
export function OrdersListPage() {
  const [state, setState] = React.useState<State>({ status: 'idle' });

  const load = React.useCallback(() => {
    setState({ status: 'loading' });
    apiRaw
      .get<OrderListItem[]>('/api/v1/orders')
      .then((orders) => setState({ status: 'ready', orders }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
        } else {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Erreur réseau',
          });
        }
      });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (state.status === 'idle' || state.status === 'loading') {
    return <Skeleton />;
  }
  if (state.status === 'unauthenticated') {
    return (
      <AuthRequired
        theme="light"
        subtitle="Connecte-toi pour voir l'historique de tes commandes."
        loginHref="/login?next=/orders"
      />
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container max-w-md py-16 text-center md:max-w-2xl">
        <p className="text-chop-danger">{state.message}</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          Réessayer
        </Button>
      </main>
    );
  }

  // ready
  if (state.orders.length === 0) {
    return (
      <main className="min-h-dvh bg-chop-warm text-chop-ink">
        <div className="container max-w-md py-12 md:max-w-3xl lg:max-w-4xl">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
            Mes commandes
          </h1>
          <EmptyState
            className="mt-8"
            icon="🍽️"
            title="Aucune commande pour l'instant"
            body="Quand tu commanderas un plat, tu le retrouveras ici."
            cta={{ label: 'Découvrir les vendeurs', href: '/restaurants' }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <div className="container max-w-md py-8 md:max-w-3xl md:py-12 lg:max-w-4xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
            Mes commandes
          </h1>
          <p className="mt-1 text-[13px] font-medium text-chop-ink-secondary md:text-[14px]">
            Les 30 dernières commandes — touche pour suivre.
          </p>
        </header>
        <div className="mb-4">
          <ConsumerPushPermissionBanner />
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {state.orders.map((o) => (
            <li key={o.id}>
              <OrderRow order={o} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function OrderRow({ order }: { order: OrderListItem }) {
  const status = STATUS_BADGE[order.status];
  const itemSummary =
    order.items.length === 1
      ? order.items[0].nameSnapshot
      : `${order.items[0]?.nameSnapshot ?? '—'} + ${order.items.length - 1} autre${order.items.length > 2 ? 's' : ''}`;
  return (
    <Link
      href={`/orders/${order.id}`}
      className="block rounded-2xl bg-chop-card-white p-4 shadow-card transition-transform active:scale-[0.99]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="truncate text-[15px] font-extrabold">{order.vendor.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${status.classes}`}
        >
          {status.label}
        </span>
      </div>
      <p className="mt-1 truncate text-[12px] font-medium text-chop-ink-secondary">{itemSummary}</p>
      <div className="mt-2 flex items-center justify-between text-[12px] font-semibold">
        <span className="text-chop-ink-secondary">{formatRelativeDate(order.createdAt)}</span>
        <span className="text-chop-red">{formatXAF(order.totalXAF)}</span>
      </div>
    </Link>
  );
}

interface BadgeStyle {
  label: string;
  classes: string;
}
const STATUS_BADGE: Record<OrderStatus, BadgeStyle> = {
  PENDING: { label: 'En attente', classes: 'bg-chop-surface-gray text-chop-ink-secondary' },
  CONFIRMED: { label: 'Confirmée', classes: 'bg-chop-red-light text-chop-red-dark' },
  ACCEPTED: { label: 'Acceptée', classes: 'bg-chop-red-light text-chop-red-dark' },
  IN_PREP: { label: 'En cuisine', classes: 'bg-chop-red-light text-chop-red-dark' },
  READY_PICKUP: { label: 'Prête', classes: 'bg-chop-red-light text-chop-red-dark' },
  PICKED_UP: { label: 'En route', classes: 'bg-chop-red-light text-chop-red-dark' },
  DELIVERED: { label: 'Livrée', classes: 'bg-chop-mboue-light text-chop-mboue' },
  CANCELLED: { label: 'Annulée', classes: 'bg-chop-danger-light text-chop-danger' },
  REFUSED: { label: 'Refusée', classes: 'bg-chop-danger-light text-chop-danger' },
  EXPIRED: { label: 'Expirée', classes: 'bg-chop-danger-light text-chop-danger' },
};

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function Skeleton() {
  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <div className="container max-w-md py-8 md:max-w-3xl md:py-12 lg:max-w-4xl">
        <div className="h-8 w-1/3 animate-pulse rounded bg-chop-surface-gray" />
        <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-chop-surface-gray"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </ul>
      </div>
    </main>
  );
}
