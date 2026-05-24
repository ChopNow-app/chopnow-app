'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
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

const TABS: { id: Tab; label: string }[] = [
  { id: 'escalations', label: 'Escalations' },
  { id: 'incidents', label: 'Incidents livreurs' },
  { id: 'cashouts', label: 'Demandes de virement' },
  { id: 'vendors', label: 'Soldes vendeurs' },
  { id: 'riders', label: 'Soldes livreurs' },
  { id: 'refunds', label: 'Remboursements en attente' },
];

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function AdminFinanceDashboard() {
  const [tab, setTab] = React.useState<Tab>('escalations');

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Finance</h1>
          <p className="text-xs text-muted-foreground">
            Dashboard de paiements et soldes — ADR-0005
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">← Console admin</Link>
        </Button>
      </header>

      <nav className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'border-destructive text-destructive'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
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
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setState({ status: 'error', message: msg });
      });
  }, [status]);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated')
    return <AuthGate label="Connexion admin requise pour les demandes de virement." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={4} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {state.data.total} demande{state.data.total > 1 ? 's' : ''}
        </p>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CashoutRequestStatus | '')}
          className="rounded-md border px-2 py-1 text-xs"
        >
          <option value="PENDING_APPROVAL">À approuver</option>
          <option value="APPROVED">Approuvées</option>
          <option value="REJECTED">Rejetées</option>
          <option value="">Toutes</option>
        </select>
      </div>
      {state.data.rows.length === 0 ? (
        <EmptyState message="Aucune demande." />
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
  const [busy, setBusy] = React.useState<'approve' | 'reject' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const approve = async () => {
    if (!confirm(`Approuver le virement de ${formatXAF(row.requestedXAF)} à ${row.vendorName} ?`))
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
            : 'Erreur';
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (rejectReason.length < 3) {
      setError('Raison requise (min 3 caractères).');
      return;
    }
    setBusy('reject');
    setError(null);
    try {
      await adminFinanceApi.rejectCashoutRequest(row.requestId, rejectReason);
      onActionComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
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
                Trusted
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-800">
                New
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
              {busy === 'approve' ? '…' : 'Approuver'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowReject((v) => !v)}
              disabled={busy !== null}
            >
              Rejeter
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
            placeholder="Raison (KYC manquant, etc.)"
            className="flex-1 rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
          />
          <Button size="sm" variant="destructive" onClick={reject} disabled={busy !== null}>
            {busy === 'reject' ? '…' : 'Confirmer le rejet'}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

function StatusBadge({ status }: { status: CashoutRequestStatus }) {
  const styles: Record<CashoutRequestStatus, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-200 text-gray-800',
  };
  const labels: Record<CashoutRequestStatus, string> = {
    PENDING_APPROVAL: 'En attente',
    APPROVED: 'Approuvé',
    REJECTED: 'Rejeté',
    CANCELLED: 'Annulé',
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// ── Vendor balances panel ───────────────────────────────────────────

function VendorBalancesPanel() {
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
          message: err instanceof Error ? err.message : 'Erreur',
        });
      });
  }, []);

  if (state.status === 'unauthenticated') return <AuthGate label="Connexion admin requise." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={6} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {state.data.total} vendeur{state.data.total > 1 ? 's' : ''} avec un solde positif
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message="Aucun solde positif." />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Nom</th>
                <th>Type</th>
                <th>Solde</th>
                <th>Trusted</th>
                <th>Dernier virement</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.rows.map((r) => (
                <tr key={r.vendorId}>
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="text-muted-foreground">{r.type}</td>
                  <td className="font-semibold">{formatXAF(r.balanceXAF)}</td>
                  <td>{r.isTrusted ? '✓' : '—'}</td>
                  <td className="text-xs text-muted-foreground">{formatDate(r.lastPayoutAt)}</td>
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
          message: err instanceof Error ? err.message : 'Erreur',
        });
      });
  }, []);

  if (state.status === 'unauthenticated') return <AuthGate label="Connexion admin requise." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={6} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {state.data.total} livreur{state.data.total > 1 ? 's' : ''} avec un solde positif
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message="Aucun solde positif." />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Nom</th>
                <th>Véhicule</th>
                <th>Solde</th>
                <th>Dernier virement</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {state.data.rows.map((r) => (
                <tr key={r.riderId}>
                  <td className="py-2 font-medium">{r.name ?? '—'}</td>
                  <td className="text-muted-foreground">{r.vehicleType}</td>
                  <td className="font-semibold">{formatXAF(r.balanceXAF)}</td>
                  <td className="text-xs text-muted-foreground">{formatDate(r.lastPayoutAt)}</td>
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
          message: err instanceof Error ? err.message : 'Erreur',
        });
      });
  }, []);

  if (state.status === 'unauthenticated') return <AuthGate label="Connexion admin requise." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={4} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {state.data.total} commande{state.data.total > 1 ? 's' : ''} en attente de remboursement
      </p>
      {state.data.rows.length === 0 ? (
        <EmptyState message="Aucun remboursement en attente." />
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 md:mx-0 md:px-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2">Commande</th>
                <th>Vendeur</th>
                <th>Montant</th>
                <th>Âge</th>
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
                    {r.ageDays}j
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
  return (
    <div className="rounded-lg border bg-muted/40 p-6 text-center">
      <p className="text-sm font-medium">{label}</p>
      <Button asChild className="mt-3" size="sm">
        <Link href="/admin/login">Se connecter</Link>
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
          message: err instanceof Error ? err.message : 'Erreur',
        });
      });
  }, []);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated') return <AuthGate label="Connexion admin requise." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={3} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {state.rows.length} ligne{state.rows.length > 1 ? 's' : ''} en attente d&apos;action
      </p>
      {state.rows.length === 0 ? (
        <EmptyState message="Aucune escalation. ✨" />
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
  const [busy, setBusy] = React.useState<'retry' | 'mark-paid' | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showMarkPaid, setShowMarkPaid] = React.useState(false);
  const [campayRef, setCampayRef] = React.useState('');
  const [note, setNote] = React.useState('');

  const canRetry = row.status === 'FAILED' && row.kind !== 'refund';
  const canMarkPaid = row.kind !== 'refund'; // Refunds are flipped via webhook, not manually marked here

  const retry = async () => {
    if (
      !confirm(
        `Réessayer ce ${row.kind === 'vendor_payout' ? 'virement vendeur' : 'virement livreur'} ?`,
      )
    )
      return;
    setBusy('retry');
    setError(null);
    try {
      if (row.kind === 'vendor_payout') await adminFinanceApi.retryVendorPayout(row.id);
      else if (row.kind === 'rider_payout') await adminFinanceApi.retryRiderPayout(row.id);
      onActionComplete();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async () => {
    if (campayRef.trim().length < 3) {
      setError('Référence Campay requise (3 caractères min).');
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
      setError(extractErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="bg-card rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 uppercase tracking-wider">
              {row.kind === 'vendor_payout'
                ? 'Vendeur'
                : row.kind === 'rider_payout'
                  ? 'Livreur'
                  : 'Remboursement'}
            </span>
            <StatusPill status={row.status} />
            <span className="text-muted-foreground">{row.ageMinutes} min</span>
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
              {busy === 'retry' ? '…' : 'Réessayer'}
            </Button>
          )}
          {canMarkPaid && (
            <Button size="sm" onClick={() => setShowMarkPaid((v) => !v)} disabled={busy !== null}>
              Marquer payé
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
            placeholder="Référence Campay (ex. CP-12345)"
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={120}
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel)"
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
          />
          <Button size="sm" variant="destructive" onClick={markPaid} disabled={busy !== null}>
            {busy === 'mark-paid' ? '…' : 'Confirmer'}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </li>
  );
}

function StatusPill({ status }: { status: EscalationItem['status'] }) {
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

function extractErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const body = err.body as { code?: string; message?: string } | undefined;
    return body?.message ?? `Erreur ${err.status}`;
  }
  return err instanceof Error ? err.message : 'Erreur inconnue';
}

// ── Rider incidents (S3 #213 / #220 — stuck-PICKED_UP triage) ─────

function RiderIncidentsPanel() {
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
          message: err instanceof Error ? err.message : 'Erreur',
        });
      });
  }, []);

  React.useEffect(load, [load]);

  if (state.status === 'unauthenticated') return <AuthGate label="Connexion admin requise." />;
  if (state.status === 'loading') return <LoadingSkeleton rows={3} />;
  if (state.status === 'error')
    return <p className="text-sm text-destructive">Erreur : {state.message}</p>;

  return (
    <section>
      <p className="mb-2 text-xs text-muted-foreground">
        {state.rows.length} commande{state.rows.length > 1 ? 's' : ''} bloquée
        {state.rows.length > 1 ? 's' : ''} en PICKED_UP &gt; 2h
      </p>
      {state.rows.length === 0 ? (
        <EmptyState message="Aucun incident livreur." />
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
      setError('Note requise (3 caractères min).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adminRiderFraudApi.resolve(row.orderId, { ...body, note: body.note.trim() });
      onActionComplete();
    } catch (err) {
      setError(extractErrorMessage(err));
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
              {row.minutesStuck} min
            </span>
            <span className="font-mono text-[11px]">{row.code}</span>
          </div>
          <p className="mt-1 text-sm font-semibold">{formatXAF(row.totalXAF)}</p>
          <p className="text-xs text-muted-foreground">
            Vendeur: <strong>{row.vendorName}</strong> · Livreur:{' '}
            <strong>{row.riderName ?? '—'}</strong>
          </p>
        </div>
        <Button
          size="sm"
          variant={open ? 'outline' : 'default'}
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
        >
          {open ? 'Annuler' : 'Résoudre'}
        </Button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <label className="block text-xs font-semibold">Action livreur</label>
            <div className="mt-1 flex gap-3">
              {(['SUSPEND', 'WARN'] as const).map((action) => (
                <label key={action} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="radio"
                    name={`rider-action-${row.orderId}`}
                    checked={body.riderAction === action}
                    onChange={() => setBody((b) => ({ ...b, riderAction: action }))}
                  />
                  {action === 'SUSPEND' ? 'Suspendre' : 'Avertir'}
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
              Compenser le vendeur (food cost)
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={body.consumerRefund}
                onChange={(e) => setBody((b) => ({ ...b, consumerRefund: e.target.checked }))}
              />
              Rembourser le consommateur
            </label>
          </div>
          <textarea
            value={body.note}
            onChange={(e) => setBody((b) => ({ ...b, note: e.target.value }))}
            placeholder="Note (visible en audit log)"
            className="w-full rounded-md border px-3 py-1.5 text-xs"
            maxLength={200}
            rows={2}
          />
          <Button size="sm" variant="destructive" onClick={resolve} disabled={busy}>
            {busy ? '…' : 'Confirmer la résolution'}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </li>
  );
}
