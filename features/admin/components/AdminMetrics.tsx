'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getPilotMetrics, type DispatchFunnel, type PilotMetrics } from '../api';
import { ApiClientError } from '@/lib/api/api-client';

function formatPercent(p: number): string {
  // 1 decimal — same shape in FR and EN; the % symbol is universal.
  return `${p.toFixed(1)}%`;
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem === 0 ? `${minutes} min` : `${minutes} min ${rem}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60} min`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface State {
  status: 'loading' | 'ready' | 'unauthenticated' | 'error';
  metrics?: PilotMetrics;
  message?: string;
}

export function AdminMetrics() {
  const t = useTranslations('Admin');
  const tCommon = useTranslations('Common');
  const locale = useLocale();
  const [state, setState] = React.useState<State>({ status: 'loading' });

  React.useEffect(() => {
    let cancelled = false;
    getPilotMetrics()
      .then((m) => {
        if (!cancelled) setState({ status: 'ready', metrics: m });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          setState({ status: 'unauthenticated' });
        } else {
          const msg = err instanceof Error ? err.message : tCommon('networkError');
          setState({ status: 'error', message: msg });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tCommon]);

  if (state.status === 'loading') {
    return <p className="text-sm text-muted-foreground">{t('metricsLoading')}</p>;
  }

  if (state.status === 'unauthenticated') {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-lg font-bold">{t('authRequiredTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('metricsAuthBody')}</p>
        <Link
          href="/admin/login"
          className="mt-3 inline-block rounded-md bg-chop-red px-4 py-2 text-sm font-semibold text-white"
        >
          {t('metricsLoginCta')}
        </Link>
      </div>
    );
  }

  if (state.status === 'error' || !state.metrics) {
    return (
      <p className="text-sm text-destructive">
        {t('metricsErrorPrefix', { message: state.message ?? t('metricsDataUnavailable') })}
      </p>
    );
  }

  const m = state.metrics;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">{t('metricsHeading')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('metricsWindow', {
            from: formatDate(m.window.from, locale),
            to: formatDate(m.window.to, locale),
          })}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title={t('kpiReorder7d')}
          value={formatPercent(m.reorderRate.percent)}
          sub={t('kpiReorderSub', {
            reorderers: m.reorderRate.reorderers,
            customers: m.reorderRate.uniqueCustomers,
          })}
          tone={m.reorderRate.percent >= 25 ? 'good' : 'neutral'}
        />
        <KpiCard
          title={t('kpiCompletion')}
          value={formatPercent(m.completionRate.percent)}
          sub={t('kpiCompletionSub', {
            delivered: m.completionRate.delivered,
            total: m.completionRate.total,
          })}
          tone={m.completionRate.percent >= 90 ? 'good' : 'warn'}
        />
        <KpiCard
          title={t('kpiAvgDelivery')}
          value={formatDuration(m.avgDeliveryTimeMs)}
          sub={t('kpiAvgDeliverySub')}
        />
        <KpiCard
          title={t('kpiAvgAccept')}
          value={formatDuration(m.avgVendorAcceptTimeMs)}
          sub={t('kpiAvgAcceptSub')}
        />
      </div>

      <DispatchFunnelSection funnel={m.dispatchFunnel} />

      <p className="text-xs text-muted-foreground">{t('metricsDecisionNote')}</p>
    </div>
  );
}

function DispatchFunnelSection({ funnel }: { funnel: DispatchFunnel }) {
  const t = useTranslations('Admin');
  const firstAttemptPct =
    funnel.ordersAssigned === 0
      ? null
      : (funnel.assignedOnFirstAttempt / funnel.ordersAssigned) * 100;

  const totalOffers = funnel.topRiders.reduce((sum, r) => sum + r.offers, 0);
  const topShare =
    totalOffers === 0 || funnel.topRiders.length === 0
      ? null
      : (funnel.topRiders[0].offers / totalOffers) * 100;
  const starvedRider = topShare !== null && topShare > 70;

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-bold">{t('funnelHeading')}</h2>
        <p className="text-xs text-muted-foreground">
          {t.rich('funnelSub', {
            code: (chunks) => (
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">{chunks}</code>
            ),
          })}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={t('funnelKpiAssigned')}
          value={String(funnel.ordersAssigned)}
          sub={t('funnelKpiAssignedSub')}
        />
        <KpiCard
          title={t('funnelKpiFirstAttempt')}
          value={firstAttemptPct === null ? '—' : formatPercent(firstAttemptPct)}
          sub={t('funnelKpiFirstAttemptSub', {
            first: funnel.assignedOnFirstAttempt,
            assigned: funnel.ordersAssigned,
          })}
          tone={firstAttemptPct === null ? 'neutral' : firstAttemptPct >= 85 ? 'good' : 'warn'}
        />
        <KpiCard
          title={t('funnelKpiAvgAttempts')}
          value={funnel.avgAttemptsToAssign === null ? '—' : funnel.avgAttemptsToAssign.toFixed(2)}
          sub={t('funnelKpiAvgAttemptsSub')}
          tone={
            funnel.avgAttemptsToAssign === null
              ? 'neutral'
              : funnel.avgAttemptsToAssign <= 1.3
                ? 'good'
                : funnel.avgAttemptsToAssign > 2
                  ? 'warn'
                  : 'neutral'
          }
        />
        <KpiCard
          title={t('funnelKpiExpired')}
          value={String(funnel.expiredNoRider)}
          sub={t('funnelKpiExpiredSub')}
          tone={funnel.expiredNoRider === 0 ? 'good' : 'warn'}
        />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('funnelTopRiders')}
          </p>
          {starvedRider && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
              {t('funnelStarved')}
            </span>
          )}
        </div>
        {funnel.topRiders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('funnelEmptyOffers')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {funnel.topRiders.map((r) => {
              const share = totalOffers === 0 ? 0 : (r.offers / totalOffers) * 100;
              return (
                <li
                  key={r.riderId}
                  className="flex items-center justify-between text-sm tabular-nums"
                >
                  <code className="text-xs text-muted-foreground">{r.riderId.slice(0, 8)}…</code>
                  <span className="font-semibold">
                    {r.offers} <span className="text-muted-foreground">({share.toFixed(0)}%)</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {starvedRider && <p className="mt-3 text-xs text-destructive">{t('funnelStarvedNote')}</p>}
      </div>
    </section>
  );
}

function KpiCard({
  title,
  value,
  sub,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  sub: string;
  tone?: 'good' | 'warn' | 'neutral';
}) {
  const valueColor =
    tone === 'good' ? 'text-mboue-green' : tone === 'warn' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className={`mt-2 text-3xl font-extrabold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}
