'use client';

// React 19's react-hooks/set-state-in-effect rule trips the standard
// fetch-on-mount pattern this hook uses. Same precedent as useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Orders');
  const tCommon = useTranslations('Common');
  const tAuth = useTranslations('AuthRequired');
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
        subtitle={tAuth('subtitleOrderHistory')}
        loginHref="/login?next=/orders"
        features={[
          { icon: '📦', label: tAuth('ordersFeature1') },
          { icon: '⏱️', label: tAuth('ordersFeature2') },
          { icon: '📍', label: tAuth('ordersFeature3') },
          { icon: '🔔', label: tAuth('ordersFeature4') },
        ]}
        reassurance={tAuth('reassurance')}
      />
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container max-w-md py-16 text-center md:max-w-2xl">
        <p className="text-chop-danger">{state.message}</p>
        <Button variant="outline" className="mt-4" onClick={load}>
          {tCommon('retry')}
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
            {t('title')}
          </h1>
          <EmptyState
            className="mt-8"
            icon="🍽️"
            title={t('emptyTitle')}
            body={t('emptyBodyAlt')}
            cta={{ label: t('discoverVendors'), href: '/restaurants' }}
          />
        </div>
      </main>
    );
  }

  return <OrdersListReady orders={state.orders} />;
}

// 10 fits one full screenful on iPhone SE width + a peek of the next
// row to signal scrollability. Subsequent "Voir plus" taps reveal 10
// more each — fast enough to feel responsive, slow enough that a user
// with 30+ orders doesn't pay the full DOM-render cost on first paint.
const ORDERS_INITIAL_LIMIT = 10;
const ORDERS_PAGE_SIZE = 10;

function OrdersListReady({ orders }: { orders: OrderListItem[] }) {
  const t = useTranslations('Orders');
  const [limit, setLimit] = React.useState(ORDERS_INITIAL_LIMIT);
  const visible = orders.slice(0, limit);
  const hiddenCount = orders.length - visible.length;

  return (
    <main className="min-h-dvh bg-chop-warm text-chop-ink">
      <div className="container max-w-md py-8 md:max-w-3xl md:py-12 lg:max-w-4xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
            {t('title')}
          </h1>
          <p className="mt-1 text-[13px] font-medium text-chop-ink-secondary md:text-[14px]">
            {t('subtitle')}
          </p>
        </header>
        <div className="mb-4">
          <ConsumerPushPermissionBanner />
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {visible.map((o) => (
            <li key={o.id}>
              <OrderRow order={o} />
            </li>
          ))}
        </ul>
        {hiddenCount > 0 ? (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLimit((l) => l + ORDERS_PAGE_SIZE)}
            >
              {t('viewMore', { count: Math.min(hiddenCount, ORDERS_PAGE_SIZE) })}
            </Button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function OrderRow({ order }: { order: OrderListItem }) {
  const t = useTranslations('Orders');
  const status = STATUS_BADGE[order.status];
  const badgeLabel = t(status.labelKey);
  const itemSummary =
    order.items.length === 1
      ? order.items[0].nameSnapshot
      : `${order.items[0]?.nameSnapshot ?? '—'} ${t('moreSuffix', { count: order.items.length - 1 })}`;
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
          {badgeLabel}
        </span>
      </div>
      <p className="mt-1 truncate text-[12px] font-medium text-chop-ink-secondary">{itemSummary}</p>
      <div className="mt-2 flex items-center justify-between text-[12px] font-semibold">
        <span className="text-chop-ink-secondary">{formatRelativeDate(order.createdAt, t)}</span>
        <span className="text-chop-red">{formatXAF(order.totalXAF)}</span>
      </div>
    </Link>
  );
}

interface BadgeStyle {
  /** i18n key under `Orders` namespace. */
  labelKey:
    | 'badgePending'
    | 'badgeConfirmed'
    | 'badgeAccepted'
    | 'badgeInPrep'
    | 'badgeReady'
    | 'badgePickedUp'
    | 'badgeDelivered'
    | 'badgeCancelled'
    | 'badgeRefused'
    | 'badgeExpired';
  classes: string;
}
const STATUS_BADGE: Record<OrderStatus, BadgeStyle> = {
  PENDING: { labelKey: 'badgePending', classes: 'bg-chop-surface-gray text-chop-ink-secondary' },
  CONFIRMED: { labelKey: 'badgeConfirmed', classes: 'bg-chop-red-light text-chop-red-dark' },
  ACCEPTED: { labelKey: 'badgeAccepted', classes: 'bg-chop-red-light text-chop-red-dark' },
  IN_PREP: { labelKey: 'badgeInPrep', classes: 'bg-chop-red-light text-chop-red-dark' },
  READY_PICKUP: { labelKey: 'badgeReady', classes: 'bg-chop-red-light text-chop-red-dark' },
  PICKED_UP: { labelKey: 'badgePickedUp', classes: 'bg-chop-red-light text-chop-red-dark' },
  DELIVERED: { labelKey: 'badgeDelivered', classes: 'bg-chop-mboue-light text-chop-mboue' },
  CANCELLED: { labelKey: 'badgeCancelled', classes: 'bg-chop-danger-light text-chop-danger' },
  REFUSED: { labelKey: 'badgeRefused', classes: 'bg-chop-danger-light text-chop-danger' },
  EXPIRED: { labelKey: 'badgeExpired', classes: 'bg-chop-danger-light text-chop-danger' },
};

// formatRelativeDate uses a t fn so it can be localized.
function formatRelativeDate(iso: string, t: ReturnType<typeof useTranslations<'Orders'>>): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t('daysAgo', { n: days });
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
