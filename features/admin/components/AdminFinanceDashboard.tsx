'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/ui/skeleton';
import { ApiClientError } from '@/lib/api/api-client';
import {
  adminFinanceApi,
  adminRiderFraudApi,
  type CashoutRequestRow,
  type CashoutRequestStatus,
  type EscalationItem,
  type PagedResult,
  type RefundQueueRow,
  type ResolveRiderFraudBody,
  type RiderBalanceRow,
  type StuckPickupItem,
  type VendorBalanceRow,
} from '../api';

type Tab = 'escalations' | 'incidents' | 'vendors' | 'riders' | 'refunds' | 'cashouts';

type TabLabelKey =
  | 'financeTabEscalations'
  | 'financeTabIncidents'
  | 'financeTabCashouts'
  | 'financeTabVendors'
  | 'financeTabRiders'
  | 'financeTabRefunds';

const TABS: { id: Tab; labelKey: TabLabelKey }[] = [
  { id: 'escalations', labelKey: 'financeTabEscalations' },
  { id: 'incidents', labelKey: 'financeTabIncidents' },
  { id: 'cashouts', labelKey: 'financeTabCashouts' },
  { id: 'vendors', labelKey: 'financeTabVendors' },
  { id: 'riders', labelKey: 'financeTabRiders' },
  { id: 'refunds', labelKey: 'financeTabRefunds' },
];

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function AdminFinanceDashboard() {
  const t = useTranslations('Admin');
  const [tab, setTab] = React.useState<Tab>('escalations');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">{t('financeTitle')}</h1>
          <p className="text-xs text-muted-foreground">{t('financeSubtitle')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">{t('financeBackToConsole')}</Link>
        </Button>
      </header>

      <nav className="flex gap-1 border-b">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === entry.id
                ? 'border-destructive text-destructive'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </nav>

      {tab === 'escalations' && <EscalationsPanel />}
      {tab === 'incidents' && <RiderIncidentsPanel />}
      {tab === 'cashouts' && <CashoutRequestsPanel />}
      {tab === 'vendors' && <VendorBalancesPanel />}
      {tab === 'riders' && <RiderBalancesPanel />}
      {tab === 'refunds' && <RefundQueuePanel />}
    </div>
  );
}

// ── Cashout requests panel ──────────────────────────────────────────

function CashoutRequestsPanel() {
  const t = useTranslations('Admin');
  const [status, setStatus] = React.useState<CashoutRequestStatus | ''>('PENDING_APPROVAL');
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: PagedResult<CashoutRequestRow> }
  >({ status: 'loading' });

  const load = React.useCallback(() => {
    setState({ status: 'loading' });
    adminFinanceApi
      .listCashoutRequests({ status: status || undefined })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        const msg = err instanceof Error ? err.message : t('financeErrUnknown');
        setState({ status: 'error', message: msg });
      });
  }, [status, t]);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthCashouts')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={4} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('cashoutsCount', { count: state.data.total })}
        </p>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CashoutRequestStatus | '')}
          className="rounded-md border px-2 py-1 text-xs"
        >
          <option value="PENDING_APPROVAL">{t('cashoutsFilterPending')}</option>
          <option value="APPROVED">{t('cashoutsFilterApproved')}</option>
          <option value="REJECTED">{t('cashoutsFilterRejected')}</option>
          <option value="">{t('cashoutsFilterAll')}</option>
        </select>
      </div>
      {state.data.rows.length === 0 ? (
        <EmptyState message={t('cashoutsEmpty')} />
      ) : (
        <ul className="divide-y rounded-lg border">
          {state.data.rows.map((r) => (
            <CashoutRow key={r.requestId} row={r} onActionComplete={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CashoutRow({
  row,
  onActionComplete,
}: {
  row: CashoutRequestRow;
  onActionComplete: () => void;
}) {
  const t = useTranslations('Admin');
  const [busy, setBusy] = React.useState<'approve' | 'reject' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const approve = async () => {
    if (
      !confirm(
        t('cashoutsApproveConfirm', {
          amount: formatXAF(row.requestedXAF),
          vendor: row.vendorName,
        }),
      )
    )
      return;
    setBusy('approve');
    setError(null);
    try {
      await adminFinanceApi.approveCashoutRequest(row.requestId);
      onActionComplete();
    } catch (err) {
      const msg =
        err instanceof ApiClientError && (err.body as { message?: string } | undefined)?.message
          ? (err.body as { message: string }).message
          : err instanceof Error
            ? err.message
            : t('financeErrFallback');
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (rejectReason.length < 3) {
      setError(t('cashoutsRejectReasonMin'));
      return;
    }
    setBusy('reject');
    setError(null);
    try {
      await adminFinanceApi.rejectCashoutRequest(row.requestId, rejectReason);
      onActionComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('financeErrFallback');
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const isPending = row.status === 'PENDING_APPROVAL';

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{row.vendorName}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider">
              {row.vendorType}
            </span>
            {row.isTrusted ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-green-800">
                {t('cashoutsTrustedBadge')}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-800">
                {t('cashoutsNewBadge')}
              </span>
            )}
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-1 text-sm">
            <strong>{formatXAF(row.requestedXAF)}</strong>
            <span className="ml-2 text-muted-foreground">· {row.ageHours}h</span>
          </p>
        </div>
        {isPending && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={approve} disabled={busy !== null}>
              {busy === 'approve' ? '…' : t('cashoutsApproveCta')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject((v) => !v)}
              disabled={busy !== null}
            >
              {t('cashoutsRejectCta')}
            </Button>
          </div>
        )}
      </div>
      {showReject && isPending && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('cashoutsRejectReasonPh')}
            className="flex-1 rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
          />
          <Button size="sm" variant="destructive" onClick={reject} disabled={busy !== null}>
            {busy === 'reject' ? '…' : t('cashoutsRejectConfirmCta')}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

function StatusBadge({ status }: { status: CashoutRequestStatus }) {
  const t = useTranslations('Admin');
  const styles: Record<CashoutRequestStatus, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-200 text-gray-800',
  };
  const labels: Record<
    CashoutRequestStatus,
    | 'cashoutsStatusPending'
    | 'cashoutsStatusApproved'
    | 'cashoutsStatusRejected'
    | 'cashoutsStatusCancelled'
  > = {
    PENDING_APPROVAL: 'cashoutsStatusPending',
    APPROVED: 'cashoutsStatusApproved',
    REJECTED: 'cashoutsStatusRejected',
    CANCELLED: 'cashoutsStatusCancelled',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${styles[status]}`}
    >
      {t(labels[status])}
    </span>
  );
}

// ── Vendor balances panel ───────────────────────────────────────────

function VendorBalancesPanel() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: PagedResult<VendorBalanceRow> }
  >({ status: 'loading' });

  React.useEffect(() => {
    adminFinanceApi
      .listVendorBalances({ minBalanceXAF: 1 })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('financeErrFallback'),
        });
      });
  }, [t]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthDefault')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={6} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('vendorsCount', { count: state.data.total })}
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message={t('vendorsEmpty')} />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">{t('vendorsTableName')}</th>
                <th>{t('vendorsTableType')}</th>
                <th>{t('vendorsTableBalance')}</th>
                <th>{t('vendorsTableTrusted')}</th>
                <th>{t('vendorsTableLastPayout')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.rows.map((r) => (
                <tr key={r.vendorId}>
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="text-muted-foreground">{r.type}</td>
                  <td className="font-semibold">{formatXAF(r.balanceXAF)}</td>
                  <td>{r.isTrusted ? '✓' : '—'}</td>
                  <td className="text-xs text-muted-foreground">
                    {formatDate(r.lastPayoutAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Rider balances panel ────────────────────────────────────────────

function RiderBalancesPanel() {
  const t = useTranslations('Admin');
  const locale = useLocale();
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: PagedResult<RiderBalanceRow> }
  >({ status: 'loading' });

  React.useEffect(() => {
    adminFinanceApi
      .listRiderBalances({ minBalanceXAF: 1 })
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('financeErrFallback'),
        });
      });
  }, [t]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthDefault')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={6} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('ridersCount', { count: state.data.total })}
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message={t('ridersEmpty')} />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">{t('ridersTableName')}</th>
                <th>{t('ridersTableVehicle')}</th>
                <th>{t('ridersTableBalance')}</th>
                <th>{t('ridersTableLastPayout')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.rows.map((r) => (
                <tr key={r.riderId}>
                  <td className="py-2 font-medium">{r.name ?? '—'}</td>
                  <td className="text-muted-foreground">{r.vehicleType}</td>
                  <td className="font-semibold">{formatXAF(r.balanceXAF)}</td>
                  <td className="text-xs text-muted-foreground">
                    {formatDate(r.lastPayoutAt, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Refund queue panel ──────────────────────────────────────────────

function RefundQueuePanel() {
  const t = useTranslations('Admin');
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; data: PagedResult<RefundQueueRow> }
  >({ status: 'loading' });

  React.useEffect(() => {
    adminFinanceApi
      .listRefundQueue({})
      .then((data) => setState({ status: 'ready', data }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('financeErrFallback'),
        });
      });
  }, [t]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthDefault')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={4} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('refundsCount', { count: state.data.total })}
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message={t('refundsEmpty')} />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">{t('refundsTableOrder')}</th>
                <th>{t('refundsTableVendor')}</th>
                <th>{t('refundsTableAmount')}</th>
                <th>{t('refundsTableAge')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.rows.map((r) => (
                <tr key={r.orderId}>
                  <td className="py-2 font-mono text-xs">{r.code}</td>
                  <td className="text-sm">{r.vendorName}</td>
                  <td className="font-semibold">{formatXAF(r.totalXAF)}</td>
                  <td
                    className={`text-xs ${
                      r.ageDays >= 3 ? 'font-bold text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {t('ageDaysShort', { n: r.ageDays })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── shared bits ─────────────────────────────────────────────────────

function AuthGate({ label }: { label: string }) {
  const t = useTranslations('Admin');
  return (
    <div className="rounded-lg border bg-muted/40 p-6 text-center">
      <p className="text-sm font-medium">{label}</p>
      <Button asChild className="mt-3" size="sm">
        <Link href="/admin/login">{t('financeAuthCta')}</Link>
      </Button>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  // Thin wrapper kept so the call sites' API stays `<LoadingSkeleton rows={N} />`.
  // Real shape lives in the shared `<ListSkeleton variant="row" />` primitive.
  return <ListSkeleton rows={rows} variant="row" className="space-y-2" />;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

// ── Escalations (ADR-0005 §S3 / #85) ────────────────────────────────

function EscalationsPanel() {
  const t = useTranslations('Admin');
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; rows: EscalationItem[] }
  >({ status: 'loading' });

  const load = React.useCallback(() => {
    setState({ status: 'loading' });
    adminFinanceApi
      .listEscalations()
      .then((rows) => setState({ status: 'ready', rows }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('financeErrFallback'),
        });
      });
  }, [t]);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthDefault')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={3} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('escalationsCount', { count: state.rows.length })}
      </p>
      {state.rows.length === 0 ? (
        <EmptyState message={t('escalationsEmpty')} />
      ) : (
        <ul className="space-y-2">
          {state.rows.map((row) => (
            <EscalationRow key={`${row.kind}:${row.id}`} row={row} onActionComplete={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EscalationRow({
  row,
  onActionComplete,
}: {
  row: EscalationItem;
  onActionComplete: () => void;
}) {
  const t = useTranslations('Admin');
  const [busy, setBusy] = React.useState<'retry' | 'mark-paid' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = React.useState(false);
  const [campayRef, setCampayRef] = React.useState('');
  const [note, setNote] = React.useState('');

  const canRetry = row.status === 'FAILED' && row.kind !== 'refund';
  const canMarkPaid = row.kind !== 'refund'; // Refunds are flipped via webhook, not manually marked here

  const retry = async () => {
    const confirmMessage =
      row.kind === 'vendor_payout'
        ? t('escalationRetryConfirmVendor')
        : t('escalationRetryConfirmRider');
    if (!confirm(confirmMessage)) return;
    setBusy('retry');
    setError(null);
    try {
      if (row.kind === 'vendor_payout') await adminFinanceApi.retryVendorPayout(row.id);
      else if (row.kind === 'rider_payout') await adminFinanceApi.retryRiderPayout(row.id);
      onActionComplete();
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async () => {
    if (campayRef.trim().length < 3) {
      setError(t('escalationCampayRefMin'));
      return;
    }
    setBusy('mark-paid');
    setError(null);
    try {
      const body = { campayRef: campayRef.trim(), note: note.trim() || undefined };
      if (row.kind === 'vendor_payout')
        await adminFinanceApi.manualMarkVendorPayoutPaid(row.id, body);
      else if (row.kind === 'rider_payout')
        await adminFinanceApi.manualMarkRiderPayoutPaid(row.id, body);
      onActionComplete();
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(null);
    }
  };

  const kindLabel =
    row.kind === 'vendor_payout'
      ? t('escalationKindVendor')
      : row.kind === 'rider_payout'
        ? t('escalationKindRider')
        : t('escalationKindRefund');

  return (
    <li className="bg-card rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wider">
              {kindLabel}
            </span>
            <StatusPill status={row.status} />
            <span className="text-muted-foreground">
              {t('escalationMinutes', { n: row.ageMinutes })}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold">{formatXAF(row.netXAF)}</p>
          <p className="text-xs text-muted-foreground">
            {row.momoPhone ?? '—'}
            {row.failureReason ? ` · ${row.failureReason}` : ''}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{row.id}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canRetry && (
            <Button size="sm" variant="outline" onClick={retry} disabled={busy !== null}>
              {busy === 'retry' ? '…' : t('escalationRetryCta')}
            </Button>
          )}
          {canMarkPaid && (
            <Button size="sm" onClick={() => setShowMarkPaid((v) => !v)} disabled={busy !== null}>
              {t('escalationMarkPaidCta')}
            </Button>
          )}
        </div>
      </div>
      {showMarkPaid && canMarkPaid && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <input
            type="text"
            value={campayRef}
            onChange={(e) => setCampayRef(e.target.value)}
            placeholder={t('escalationCampayRefPh')}
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={120}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('escalationNotePh')}
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
          />
          <Button size="sm" variant="destructive" onClick={markPaid} disabled={busy !== null}>
            {busy === 'mark-paid' ? '…' : t('escalationConfirmCta')}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

function StatusPill({ status }: { status: EscalationItem['status'] }) {
  // Status codes are operator-facing tokens (FAILED/IN_FLIGHT/STALE_REFUND)
  // — kept untranslated like the legacy `vendorType` codes elsewhere in
  // the admin surface.
  const styles: Record<string, string> = {
    FAILED: 'bg-red-100 text-red-800',
    IN_FLIGHT: 'bg-amber-100 text-amber-800',
    STALE_REFUND: 'bg-amber-100 text-amber-800',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
        styles[status] ?? 'bg-muted'
      }`}
    >
      {status}
    </span>
  );
}

function extractErrorMessage(err: unknown, t: ReturnType<typeof useTranslations<'Admin'>>): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    return body?.message ?? `${t('financeErrFallback')} ${err.status}`;
  }
  return err instanceof Error ? err.message : t('financeErrUnknown');
}

// ── Rider incidents (S3 #213 / #220 — stuck-PICKED_UP triage) ─────

function RiderIncidentsPanel() {
  const t = useTranslations('Admin');
  const [state, setState] = React.useState<
    | { status: 'loading' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string }
    | { status: 'ready'; rows: StuckPickupItem[] }
  >({ status: 'loading' });

  const load = React.useCallback(() => {
    setState({ status: 'loading' });
    adminRiderFraudApi
      .listStuckPickups()
      .then((rows) => setState({ status: 'ready', rows }))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 401) {
          setState({ status: 'unauthenticated' });
          return;
        }
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : t('financeErrFallback'),
        });
      });
  }, [t]);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated') return <AuthGate label={t('financeAuthDefault')} />;
  if (state.status === 'loading') return <LoadingSkeleton rows={3} />;
  if (state.status === 'error')
    return (
      <p className="text-sm text-destructive">
        {t('financeErrPrefix', { message: state.message })}
      </p>
    );

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {t('incidentsCount', { count: state.rows.length })}
      </p>
      {state.rows.length === 0 ? (
        <EmptyState message={t('incidentsEmpty')} />
      ) : (
        <ul className="space-y-2">
          {state.rows.map((row) => (
            <RiderIncidentRow key={row.orderId} row={row} onActionComplete={load} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RiderIncidentRow({
  row,
  onActionComplete,
}: {
  row: StuckPickupItem;
  onActionComplete: () => void;
}) {
  const t = useTranslations('Admin');
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [body, setBody] = React.useState<ResolveRiderFraudBody>({
    riderAction: 'SUSPEND',
    vendorCompensation: true,
    consumerRefund: true,
    note: '',
  });

  const resolve = async () => {
    if (body.note.trim().length < 3) {
      setError(t('incidentsNoteMin'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminRiderFraudApi.resolve(row.orderId, { ...body, note: body.note.trim() });
      onActionComplete();
    } catch (err) {
      setError(extractErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="bg-card rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 uppercase tracking-wider text-amber-800">
              {t('incidentsMinutesStuck', { n: row.minutesStuck })}
            </span>
            <span className="font-mono text-[11px]">{row.code}</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{formatXAF(row.totalXAF)}</p>
          <p className="text-xs text-muted-foreground">
            {t.rich('incidentsVendorRiderLine', {
              vendor: row.vendorName,
              rider: row.riderName ?? t('incidentsRiderNone'),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? 'outline' : 'default'}
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
        >
          {open ? t('incidentsCancelCta') : t('incidentsResolveCta')}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <label className="block text-xs font-semibold">{t('incidentsActionLabel')}</label>
            <div className="mt-1 flex gap-3">
              {(['SUSPEND', 'WARN'] as const).map((action) => (
                <label key={action} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name={`rider-action-${row.orderId}`}
                    checked={body.riderAction === action}
                    onChange={() => setBody((b) => ({ ...b, riderAction: action }))}
                  />
                  {action === 'SUSPEND' ? t('incidentsActionSuspend') : t('incidentsActionWarn')}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={body.vendorCompensation}
                onChange={(e) => setBody((b) => ({ ...b, vendorCompensation: e.target.checked }))}
              />
              {t('incidentsCompensateVendor')}
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={body.consumerRefund}
                onChange={(e) => setBody((b) => ({ ...b, consumerRefund: e.target.checked }))}
              />
              {t('incidentsRefundConsumer')}
            </label>
          </div>
          <textarea
            value={body.note}
            onChange={(e) => setBody((b) => ({ ...b, note: e.target.value }))}
            placeholder={t('incidentsNotePh')}
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
            rows={2}
          />
          <Button size="sm" variant="destructive" onClick={resolve} disabled={busy}>
            {busy ? '…' : t('incidentsConfirmCta')}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </li>
  );
}
