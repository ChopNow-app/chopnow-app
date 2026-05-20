'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ApiClientError } from '@/lib/api/api-client';
import { adminApi, adminEmail, adminLogout, adminRole } from '../api';
import {
  usePendingRiders,
  usePendingVendors,
  type PendingRider,
  type PendingVendor,
} from '../hooks/useValidationQueues';

const formatDate = (iso: string) => new Date(iso).toLocaleString('fr-FR');

export function AdminDashboard() {
  const router = useRouter();
  const vendors = usePendingVendors();
  const riders = usePendingRiders();
  const email = adminEmail();
  const role = adminRole();

  if (vendors.status === 'unauthenticated' || riders.status === 'unauthenticated') {
    return (
      <div className="container max-w-md py-12 text-center">
        <h2 className="text-xl font-bold">Connexion admin requise</h2>
        <Button asChild className="mt-4">
          <Link href="/admin/login">Se connecter</Link>
        </Button>
      </div>
    );
  }

  if (vendors.status === 'forbidden' || riders.status === 'forbidden') {
    return (
      <div className="container max-w-md py-12 text-center">
        <h2 className="text-xl font-bold">Permissions insuffisantes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ce compte n&apos;a pas accès aux files de validation.
        </p>
      </div>
    );
  }

  const onLogout = () => {
    adminLogout();
    router.replace('/admin/login');
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Console Admin</h1>
          {email ? (
            <p className="text-xs text-muted-foreground">
              {email} · {role ?? '—'}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/finance"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            Finance
          </Link>
          <Link
            href="/admin/metrics"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
          >
            Métriques pilote
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={onLogout}>
            Déconnexion
          </Button>
        </div>
      </header>

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Vendeurs en attente
            {vendors.status === 'ready' ? ` (${vendors.rows.length})` : null}
          </h2>
          {vendors.status === 'ready' ? (
            <button
              type="button"
              onClick={vendors.reload}
              className="text-xs text-muted-foreground underline"
            >
              Actualiser
            </button>
          ) : null}
        </header>
        <QueueBody
          state={vendors}
          renderRow={(v) => <VendorRow key={v.id} vendor={v} onChanged={vendors.reload} />}
          emptyMessage="Aucun dossier vendeur en attente."
        />
      </section>

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            Livreurs en attente
            {riders.status === 'ready' ? ` (${riders.rows.length})` : null}
          </h2>
          {riders.status === 'ready' ? (
            <button
              type="button"
              onClick={riders.reload}
              className="text-xs text-muted-foreground underline"
            >
              Actualiser
            </button>
          ) : null}
        </header>
        <QueueBody
          state={riders}
          renderRow={(r) => <RiderRow key={r.id} rider={r} onChanged={riders.reload} />}
          emptyMessage="Aucun dossier livreur en attente."
        />
      </section>
    </div>
  );
}

function QueueBody<T>({
  state,
  renderRow,
  emptyMessage,
}: {
  state: { status: string; rows?: T[]; message?: string };
  renderRow: (row: T) => React.ReactNode;
  emptyMessage: string;
}) {
  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card h-24 animate-pulse rounded-lg border" />
        ))}
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {state.message}
      </p>
    );
  }
  if (state.status === 'ready' && state.rows!.length === 0) {
    return (
      <p className="bg-card rounded-lg border p-4 text-sm text-muted-foreground">{emptyMessage}</p>
    );
  }
  if (state.status === 'ready') {
    return <ul className="space-y-3">{state.rows!.map((row) => renderRow(row))}</ul>;
  }
  return null;
}

function VendorRow({ vendor, onChanged }: { vendor: PendingVendor; onChanged: () => void }) {
  return (
    <li className="bg-card rounded-lg border p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{vendor.name}</p>
          <p className="text-xs text-muted-foreground">
            {vendor.type} · 📍 {vendor.quartier}
            {vendor.pointOfReference ? ` · ${vendor.pointOfReference}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            📱 {vendor.whatsappPhone} · Capacité {vendor.declaredCapacity ?? '?'} / jour
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soumis le {formatDate(vendor.submittedAt)}
          </p>
        </div>
        {vendor.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/r2/${vendor.profilePhotoUrl}`}
            alt={vendor.name}
            className="h-16 w-16 shrink-0 rounded-md object-cover"
          />
        ) : null}
      </header>

      {/* Restaurant KYC block — only rendered when type=RESTAURANT and at
          least one KYC field is populated. The text + link give the admin
          everything they need to verify legal identity before approving. */}
      {vendor.type === 'RESTAURANT' &&
      (vendor.rccmNumber || vendor.niuNumber || vendor.enseignePhotoUrl) ? (
        <div className="mt-3 rounded-md border border-chop-red/30 bg-chop-red-light/40 p-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-chop-red">
            🏛️ Documents légaux
          </p>
          <p className="text-xs text-chop-ink">
            {vendor.rccmNumber ? (
              <>
                RCCM : <span className="font-mono font-semibold">{vendor.rccmNumber}</span>
              </>
            ) : null}
            {vendor.rccmNumber && vendor.niuNumber ? ' · ' : null}
            {vendor.niuNumber ? (
              <>
                NIU : <span className="font-mono font-semibold">{vendor.niuNumber}</span>
              </>
            ) : null}
          </p>
          {vendor.enseignePhotoUrl ? (
            <a
              href={`/r2/${vendor.enseignePhotoUrl}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block text-xs font-semibold text-chop-red underline"
            >
              Voir la photo d&apos;enseigne →
            </a>
          ) : null}
        </div>
      ) : null}

      <PreOrdersToggle vendor={vendor} onChanged={onChanged} />

      <DecisionActions
        onApprove={() => adminApi.approveVendor(vendor.id)}
        onReject={(reason) => adminApi.rejectVendor(vendor.id, reason)}
        onSuspend={(reason) => adminApi.suspendVendor(vendor.id, reason)}
        onChanged={onChanged}
      />
    </li>
  );
}

// #187 follow-up — pre-orders opt-in toggle. INFORMAL vendors default to true
// at submission; this lets admin override per vendor without code changes
// (opt in a willing SEMI_FORMAL, opt out an INFORMAL whose kitchen doesn't fit).
function PreOrdersToggle({ vendor, onChanged }: { vendor: PendingVendor; onChanged: () => void }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.setVendorPreOrders(vendor.id, !vendor.acceptsPreOrders);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-divider bg-chop-warm/40 p-2">
      <div className="min-w-0">
        <p className="text-xs font-semibold">Pré-commandes</p>
        <p className="text-[11px] text-muted-foreground">
          Le client peut programmer cette commande à l&apos;avance (≤24h).
        </p>
        {error ? <p className="mt-0.5 text-[11px] text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-50 ${
          vendor.acceptsPreOrders
            ? 'border-chop-mboue bg-chop-mboue text-white hover:bg-chop-mboue/90'
            : 'border-divider bg-chop-card-white text-chop-ink-secondary hover:bg-chop-surface-gray'
        }`}
        aria-pressed={vendor.acceptsPreOrders}
      >
        {busy ? '…' : vendor.acceptsPreOrders ? 'Activé' : 'Désactivé'}
      </button>
    </div>
  );
}

function RiderRow({ rider, onChanged }: { rider: PendingRider; onChanged: () => void }) {
  return (
    <li className="bg-card rounded-lg border p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{rider.user.displayName ?? 'Sans nom'}</p>
          <p className="text-xs text-muted-foreground">
            {rider.vehicleType}
            {rider.licensePlate ? ` · ${rider.licensePlate}` : ''}
            {rider.preferredZone ? ` · 📍 ${rider.preferredZone}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            📱 {rider.user.phone} · MoMo {rider.momoPhone}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Soumis le {formatDate(rider.submittedAt)}
          </p>
        </div>
      </header>
      <div className="mt-2 flex gap-2 text-xs">
        {rider.idCardPhotoUrl ? (
          <a
            className="underline"
            href={`/r2/${rider.idCardPhotoUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            CNI
          </a>
        ) : null}
        {rider.selfiePhotoUrl ? (
          <a
            className="underline"
            href={`/r2/${rider.selfiePhotoUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            Selfie
          </a>
        ) : null}
        {rider.vehiclePhotoUrl ? (
          <a
            className="underline"
            href={`/r2/${rider.vehiclePhotoUrl}`}
            target="_blank"
            rel="noreferrer"
          >
            Véhicule
          </a>
        ) : null}
      </div>
      <DecisionActions
        onApprove={() => adminApi.approveRider(rider.id)}
        onReject={(reason) => adminApi.rejectRider(rider.id, reason)}
        onSuspend={(reason) => adminApi.suspendRider(rider.id, reason)}
        onChanged={onChanged}
      />
    </li>
  );
}

function DecisionActions({
  onApprove,
  onReject,
  onSuspend,
  onChanged,
}: {
  onApprove: () => Promise<unknown>;
  onReject: (reason: string) => Promise<unknown>;
  onSuspend: (reason: string) => Promise<unknown>;
  onChanged: () => void;
}) {
  const [busy, setBusy] = React.useState<null | 'approve' | 'reject' | 'suspend'>(null);
  const [error, setError] = React.useState<string | null>(null);

  const wrap = async (label: 'approve' | 'reject' | 'suspend', promise: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await promise();
      onChanged();
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? ((err.body as { message?: string } | undefined)?.message ?? `Erreur ${err.status}`)
          : (err as Error).message;
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    const reason = window.prompt('Motif du refus ?');
    if (!reason) return;
    await wrap('reject', () => onReject(reason));
  };

  const suspend = async () => {
    const reason = window.prompt('Motif de suspension ?');
    if (!reason) return;
    await wrap('suspend', () => onSuspend(reason));
  };

  return (
    <div className="mt-3 space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy !== null}
          onClick={() => wrap('approve', onApprove)}
        >
          {busy === 'approve' ? '…' : '✅ Approuver'}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={reject}>
          {busy === 'reject' ? '…' : '❌ Refuser'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy !== null}
          onClick={suspend}
        >
          {busy === 'suspend' ? '…' : '⏸ Suspendre'}
        </Button>
      </div>
    </div>
  );
}
