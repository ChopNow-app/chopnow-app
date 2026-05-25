'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useVendorBalance, type PayoutSummary } from '../hooks/useVendorBalance';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

// All dates from the API are UTC ISO strings; render them as Africa/Douala
// local time. Cameroon is UTC+1 year-round so a single fixed offset is safe.
const DOUALA_OFFSET_MS = 3600_000;

function formatDoualaDateTime(iso: string, locale: string): string {
  const utc = new Date(iso);
  const douala = new Date(utc.getTime() + DOUALA_OFFSET_MS);
  const date = douala.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
  const hh = douala.getUTCHours().toString().padStart(2, '0');
  const mm = douala.getUTCMinutes().toString().padStart(2, '0');
  return `${date} · ${hh}h${mm}`;
}

function useRelativePastFormatter(): (iso: string) => string {
  const t = useTranslations('Vendor');
  return React.useCallback(
    (iso: string) => {
      const target = new Date(iso).getTime();
      const diffMs = Date.now() - target;
      if (diffMs < 0) return t('relativeFuture');
      const days = Math.floor(diffMs / (24 * 3600_000));
      if (days === 0) return t('relativeToday');
      if (days === 1) return t('relativeYesterday');
      if (days < 7) return t('relativeDaysAgo', { n: days });
      if (days < 30) return t('relativeWeeksAgo', { n: Math.floor(days / 7) });
      return t('relativeMonthsAgo', { n: Math.floor(days / 30) });
    },
    [t],
  );
}

function usePayoutStatusLabel() {
  const t = useTranslations('Vendor');
  return React.useCallback(
    (status: PayoutSummary['status']): { text: string; className: string } => {
      switch (status) {
        case 'PAID':
          return { text: t('payoutStatusPaid'), className: 'text-chop-mboue' };
        case 'IN_FLIGHT':
          return { text: t('payoutStatusInFlight'), className: 'text-amber-600' };
        case 'PENDING':
          return { text: t('payoutStatusPending'), className: 'text-muted-foreground' };
        case 'FAILED':
          return { text: t('payoutStatusFailed'), className: 'text-destructive' };
        case 'CANCELLED':
          return { text: t('payoutStatusCancelled'), className: 'text-muted-foreground' };
        default:
          return { text: status, className: 'text-muted-foreground' };
      }
    },
    [t],
  );
}

/**
 * Story 7.2 — vendor self-service "Mon solde" card. Shows balance, next
 * scheduled payout, last paid payout, and recent history. Polls every 30s
 * via useVendorBalance.
 *
 * For INFORMAL vendors, the existing CashoutRequestSection sits right below
 * this card — together they form the on-demand cashout flow. For RESTAURANT
 * and SEMI_FORMAL vendors, the next-payout line tells them when the cron
 * will move money.
 */
export function MonSoldeCard() {
  const t = useTranslations('Vendor');
  const locale = useLocale();
  const formatRelativePast = useRelativePastFormatter();
  const payoutStatusLabel = usePayoutStatusLabel();
  const balance = useVendorBalance();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  if (balance.status === 'loading') {
    return (
      <section className="bg-card rounded-lg border p-4">
        <p className="text-xs text-muted-foreground">{t('soldeLoading')}</p>
      </section>
    );
  }

  if (balance.status === 'error') {
    return (
      <section className="bg-card rounded-lg border p-4">
        <h2 className="text-base font-extrabold">{t('soldeTitle')}</h2>
        <p className="mt-1 text-xs text-destructive">{balance.message}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={balance.reload}>
          {t('soldeRetry')}
        </Button>
      </section>
    );
  }

  if (balance.status === 'unauthenticated') {
    return null;
  }

  const { balance: view } = balance;
  const isOnDemand = view.nextScheduledPayout.cadence === 'ON_DEMAND';

  return (
    <section className="bg-card rounded-lg border p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {t('soldeHeadingShort')}
        </h2>
        {view.vendorType === 'INFORMAL' && view.isTrusted ? (
          <span className="rounded-full bg-chop-mboue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-chop-mboue">
            {t('soldeVerifiedBadge')}
          </span>
        ) : null}
      </header>

      <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatXAF(view.balanceXAF)}</p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{t('soldeNextPayoutLabel')}</dt>
          <dd className="text-right text-xs font-semibold">
            {isOnDemand ? (
              t('soldeOnDemand')
            ) : view.nextScheduledPayout.estimatedAt ? (
              formatDoualaDateTime(view.nextScheduledPayout.estimatedAt, locale)
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{t('soldeLastPayoutLabel')}</dt>
          <dd className="text-right text-xs font-semibold">
            {view.lastPayoutAt && view.lastPayoutXAF !== null ? (
              <>
                {formatXAF(view.lastPayoutXAF)}{' '}
                <span className="font-normal text-muted-foreground">
                  · {formatRelativePast(view.lastPayoutAt)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t('soldeNoPayoutYet')}</span>
            )}
          </dd>
        </div>
      </dl>

      {view.recentPayouts.length > 0 ? (
        <div className="mt-3 border-t pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-xs font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <span>{t('soldeHistoryToggle', { count: view.recentPayouts.length })}</span>
            <span className="text-[10px]">{historyOpen ? '▴' : '▾'}</span>
          </button>
          {historyOpen ? (
            <ul className="mt-2 space-y-1.5">
              {view.recentPayouts.map((p) => {
                const label = payoutStatusLabel(p.status);
                return (
                  <li
                    key={p.id}
                    className="flex items-baseline justify-between gap-2 text-xs tabular-nums"
                  >
                    <span className="text-muted-foreground">
                      {new Date(p.periodEnd).toLocaleDateString(
                        locale === 'fr' ? 'fr-FR' : 'en-US',
                        { day: '2-digit', month: 'short' },
                      )}
                    </span>
                    <span className="flex-1 text-right font-semibold">{formatXAF(p.netXAF)}</span>
                    <span className={`text-[10px] font-bold uppercase ${label.className}`}>
                      {label.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
