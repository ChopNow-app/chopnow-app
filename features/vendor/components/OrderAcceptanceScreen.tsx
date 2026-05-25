'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { apiRaw, ApiClientError } from '@/lib/api/api-client';
import { queryKeys } from '@/lib/query/keys';
import { cn } from '@/lib/utils';
import { useVendorOrder } from '../hooks/useVendorOrder';
import type { VendorOrder } from '../hooks/useVendorOrders';
import { CountdownCircle } from './CountdownCircle';

const ACCEPTANCE_TTL_SECONDS = 60; // mirrors chopnow-api/src/modules/orders/orders.service.ts

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

type RefusalReason = 'ITEM_OUT_OF_STOCK' | 'CLOSED' | 'TOO_MANY_ORDERS' | 'POWER_OUTAGE' | 'OTHER';

type RefusalReasonLabelKey =
  | 'orderAcceptanceRefuseReasonItemOos'
  | 'orderAcceptanceRefuseReasonClosed'
  | 'orderAcceptanceRefuseReasonTooMany'
  | 'orderAcceptanceRefuseReasonPowerOutage'
  | 'orderAcceptanceRefuseReasonOther';

const REFUSAL_REASONS: ReadonlyArray<{ value: RefusalReason; labelKey: RefusalReasonLabelKey }> = [
  { value: 'ITEM_OUT_OF_STOCK', labelKey: 'orderAcceptanceRefuseReasonItemOos' },
  { value: 'CLOSED', labelKey: 'orderAcceptanceRefuseReasonClosed' },
  { value: 'TOO_MANY_ORDERS', labelKey: 'orderAcceptanceRefuseReasonTooMany' },
  { value: 'POWER_OUTAGE', labelKey: 'orderAcceptanceRefuseReasonPowerOutage' },
  { value: 'OTHER', labelKey: 'orderAcceptanceRefuseReasonOther' },
] as const;

interface Props {
  orderId: string;
}

export function OrderAcceptanceScreen({ orderId }: Props) {
  const t = useTranslations('Vendor');
  const orderState = useVendorOrder(orderId);

  if (orderState.status === 'loading') {
    return (
      <Shell>
        <div className="mt-16 flex flex-col items-center gap-3">
          <div className="h-36 w-36 animate-pulse rounded-full bg-chop-surface-gray" />
          <div className="h-3 w-32 animate-pulse rounded bg-chop-surface-gray" />
        </div>
      </Shell>
    );
  }

  if (orderState.status === 'unauthenticated') {
    return (
      <Shell>
        <EmptyState
          title={t('orderAcceptanceLoadingTitle')}
          message={t('orderAcceptanceLoadingBody')}
          ctaHref="/login?next=/vendor"
          ctaLabel={t('menuScreenAuthCta')}
        />
      </Shell>
    );
  }

  if (orderState.status === 'not_found') {
    return (
      <Shell>
        <EmptyState
          title={t('orderAcceptanceNotFoundTitle')}
          message={t('orderAcceptanceNotFoundBody')}
          ctaHref="/vendor"
          ctaLabel={t('ctaBackDashboard')}
        />
      </Shell>
    );
  }

  if (orderState.status === 'error') {
    return (
      <Shell>
        <EmptyState
          title={t('orderAcceptanceErrTitle')}
          message={orderState.message}
          ctaHref="/vendor"
          ctaLabel={t('ctaBackDashboard')}
        />
      </Shell>
    );
  }

  return <DecisionView order={orderState.order} />;
}

function DecisionView({ order }: { order: VendorOrder }) {
  const t = useTranslations('Vendor');
  const router = useRouter();
  const decidable = order.status === 'PENDING' || order.status === 'CONFIRMED';

  if (!decidable) {
    return <TerminalView order={order} />;
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <p
          aria-hidden
          className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red"
        >
          {t('orderAcceptanceEyebrowNew')}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t('orderAcceptanceH1')}</h1>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{t('orderAcceptanceBody')}</p>

        {order.acceptanceDeadlineAt ? (
          <CountdownCircle
            className="mt-6"
            deadlineAt={order.acceptanceDeadlineAt}
            ttlSeconds={ACCEPTANCE_TTL_SECONDS}
          />
        ) : (
          <p className="mt-8 text-sm text-amber-700">{t('orderAcceptanceNoDeadline')}</p>
        )}
      </div>

      <OrderSummaryCard order={order} />
      <DeliveryCard order={order} />

      <DecisionButtons
        orderId={order.id}
        onDone={() => router.push('/vendor')}
        onError={(msg) => window.alert(msg)}
      />

      <Link
        href="/vendor"
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-chop-card-white px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-chop-surface-gray"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t('ctaBackDashboard')}
      </Link>
    </Shell>
  );
}

function TerminalView({ order }: { order: VendorOrder }) {
  const t = useTranslations('Vendor');
  const label =
    order.status === 'ACCEPTED' || order.status === 'IN_PREP' || order.status === 'READY_PICKUP'
      ? t('orderAcceptanceTerminalAccepted')
      : order.status === 'REFUSED'
        ? t('orderAcceptanceTerminalRefused')
        : order.status === 'CANCELLED'
          ? t('orderAcceptanceTerminalCancelled')
          : order.status;
  const isPositive =
    order.status === 'ACCEPTED' || order.status === 'IN_PREP' || order.status === 'READY_PICKUP';

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <p
          aria-hidden
          className={cn(
            'text-[11px] font-extrabold uppercase tracking-[0.22em]',
            isPositive ? 'text-chop-mboue' : 'text-chop-ink-secondary',
          )}
        >
          {t('orderAcceptanceTerminalEyebrow')}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{label}</h1>
        <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
          {t('orderAcceptanceTerminalNoDecision')}
        </p>
      </div>

      <OrderSummaryCard order={order} />

      <Link
        href="/vendor"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-chop-ink px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-chop-ink/90"
      >
        {t('ctaBackDashboard')}
      </Link>
    </Shell>
  );
}

function OrderSummaryCard({ order }: { order: VendorOrder }) {
  const t = useTranslations('Vendor');
  return (
    <section className="mt-6 rounded-2xl bg-chop-card-white p-4 shadow-card">
      <header className="flex items-baseline justify-between border-b border-divider pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {t('orderAcceptanceSummaryEyebrow')}
          </p>
          <p className="mt-0.5 text-base font-extrabold tracking-wide">{order.code}</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">
          {labelForPayment(order.paymentMethod)}
        </p>
      </header>
      <ul className="mt-3 space-y-2">
        {order.items.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-md bg-chop-red-light px-1 text-[11px] font-bold text-chop-red">
                ×{line.quantity}
              </span>
              <span className="truncate">{line.nameSnapshot}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {formatXAF(line.lineXAF)}
            </span>
          </li>
        ))}
      </ul>
      <footer className="mt-3 flex items-center justify-between border-t border-divider pt-3">
        <span className="text-sm font-semibold">{t('orderAcceptanceSummaryTotal')}</span>
        <span className="text-lg font-extrabold text-chop-red">{formatXAF(order.totalXAF)}</span>
      </footer>
      {order.noteForVendor ? (
        <p className="mt-3 rounded-lg bg-chop-warm p-2.5 text-xs">📝 {order.noteForVendor}</p>
      ) : null}
    </section>
  );
}

function DeliveryCard({ order }: { order: VendorOrder }) {
  const t = useTranslations('Vendor');
  return (
    <section className="mt-3 flex items-start gap-3 rounded-2xl bg-chop-card-white p-4 shadow-card">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chop-red-light text-chop-red">
        <MapPin className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">
          {order.deliveryLandmark
            ? t('orderAcceptanceDeliveryLabelLandmark', {
                quartier: order.deliveryQuartier,
                landmark: order.deliveryLandmark,
              })
            : t('orderAcceptanceDeliveryLabel', { quartier: order.deliveryQuartier })}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('orderAcceptanceDeliveryAuto')}</p>
      </div>
    </section>
  );
}

function DecisionButtons({
  orderId,
  onDone,
  onError,
}: {
  orderId: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations('Vendor');
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState<null | 'accept' | 'refuse'>(null);
  const [refusing, setRefusing] = React.useState(false);
  const [reason, setReason] = React.useState<RefusalReason>('ITEM_OUT_OF_STOCK');

  const invalidateOrders = () => {
    // Vendor list (both immediate + preorder tabs) and the single-order
    // detail both reflect a status change here.
    void qc.invalidateQueries({ queryKey: ['vendor', 'orders'] });
    void qc.invalidateQueries({ queryKey: queryKeys.vendor.order(orderId) });
  };

  const accept = async () => {
    setBusy('accept');
    try {
      await apiRaw.patch(`/api/v1/orders/${orderId}/accept`, {});
      invalidateOrders();
      onDone();
    } catch (err) {
      onError(extract(err) ?? t('orderAcceptanceAcceptFailed'));
    } finally {
      setBusy(null);
    }
  };

  const submitRefuse = async () => {
    setBusy('refuse');
    try {
      await apiRaw.patch(`/api/v1/orders/${orderId}/refuse`, { reason });
      invalidateOrders();
      onDone();
    } catch (err) {
      onError(extract(err) ?? t('orderAcceptanceRefuseFailed'));
    } finally {
      setBusy(null);
      setRefusing(false);
    }
  };

  if (refusing) {
    return (
      <section className="mt-6 space-y-3 rounded-2xl bg-chop-card-white p-4 shadow-card">
        <p className="text-sm font-semibold">{t('orderAcceptanceMotifLabel')}</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as RefusalReason)}
          className="w-full rounded-xl border border-divider bg-background px-3 py-2.5 text-sm focus:border-chop-red focus:outline-none focus:ring-2 focus:ring-chop-red/30"
        >
          {REFUSAL_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {t(r.labelKey)}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={busy === 'refuse'}
            onClick={submitRefuse}
            className="flex-1"
          >
            {busy === 'refuse' ? t('saveProgress') : t('orderAcceptanceConfirmRefuse')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRefusing(false)}
            disabled={busy !== null}
          >
            {t('orderAcceptanceCancelRefuse')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        size="lg"
        disabled={busy === 'accept'}
        onClick={accept}
        className="flex-[2] gap-2 bg-chop-red text-base shadow-card hover:bg-chop-red/90"
      >
        <Check className="h-5 w-5" aria-hidden />
        {busy === 'accept' ? t('saveProgress') : t('orderAcceptanceCtaAccept')}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={busy !== null}
        onClick={() => setRefusing(true)}
        className="flex-1 gap-2 border-chop-danger text-chop-danger hover:bg-chop-danger-light"
      >
        <X className="h-5 w-5" aria-hidden />
        {t('orderAcceptanceCtaRefuse')}
      </Button>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  // Full-screen takeover — the countdown screen is a decision moment that
  // shouldn't compete with the vendor layout's chrome. We render fixed,
  // covering inset-0 with the surface-gray background, and the inner
  // content is a scrollable column that widens on desktop (md:max-w-3xl)
  // for vendor staff on PCs / large tablets.
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-chop-surface-gray">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-8 md:max-w-3xl md:px-8">
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

function labelForPayment(m: VendorOrder['paymentMethod']): string {
  // MTN MoMo / Orange Money — brand names, locale-independent.
  return m === 'MTN_MOMO' ? 'MTN MoMo' : 'Orange Money';
}

function extract(err: unknown): string | null {
  if (err instanceof ApiClientError) {
    const body = err.body as { message?: string } | undefined;
    return body?.message ?? `Erreur ${err.status}`;
  }
  return (err as Error)?.message ?? null;
}
