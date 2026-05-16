'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/PhoneInput';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

type Role = 'vendor' | 'rider';
type Status = 'PENDING_REVIEW' | 'CORRECTION_REQUESTED' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';

interface StatusPayload {
  status: Status;
  submittedAt: string;
  validatedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

type CheckState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'found'; status: StatusPayload }
  | { kind: 'not_found' }
  | { kind: 'rate_limited' }
  | { kind: 'error'; message: string };

const STATUS_COPY: Record<
  Status,
  { label: string; tone: 'pending' | 'attention' | 'success' | 'danger'; body: string }
> = {
  PENDING_REVIEW: {
    label: 'En cours de vérification',
    tone: 'pending',
    body: "Ton dossier est dans la file. Notre équipe te répond sur WhatsApp dès qu'il est validé.",
  },
  CORRECTION_REQUESTED: {
    label: 'Correction demandée',
    tone: 'attention',
    body: "On t'a contacté sur WhatsApp pour un ajustement. Renvoie la version corrigée pour relancer la validation.",
  },
  ACTIVE: {
    label: 'Activé',
    tone: 'success',
    body: 'Ton compte est actif. Connecte-toi avec ton numéro WhatsApp pour ouvrir le dashboard.',
  },
  SUSPENDED: {
    label: 'Suspendu',
    tone: 'danger',
    body: 'Le compte est temporairement suspendu. Contacte le support TChopNow pour la suite.',
  },
  REJECTED: {
    label: 'Refusé',
    tone: 'danger',
    body: "La demande n'a pas été retenue. Tu peux refaire l'inscription avec des informations à jour.",
  },
};

const TONE_CLASSES: Record<'pending' | 'attention' | 'success' | 'danger', string> = {
  pending: 'bg-chop-surface-gray text-chop-ink-secondary',
  attention: 'bg-chop-red-light text-chop-red-dark',
  success: 'bg-chop-mboue-light text-chop-mboue',
  danger: 'bg-chop-danger-light text-chop-danger',
};

// Story 1.4 / 2.0 follow-up (#13) — public submission status check.
// Vendor or rider drops their phone, sees where they sit in the validation
// pipeline. Calls one of two throttled public endpoints depending on the
// role tab. No auth required.
export function StatusCheckPage() {
  const [role, setRole] = React.useState<Role>('vendor');
  const [phone, setPhone] = React.useState('');
  const [state, setState] = React.useState<CheckState>({ kind: 'idle' });

  const onCheck = async () => {
    if (!phone || phone.length < 9) {
      setState({
        kind: 'error',
        message: 'Entre ton numéro WhatsApp (9 chiffres, ex: 670000000).',
      });
      return;
    }
    setState({ kind: 'checking' });
    try {
      const path = role === 'vendor' ? '/api/vendors/status' : '/api/riders/status';
      const res = await fetch(`${API_URL}${path}?phone=${encodeURIComponent(phone)}`);
      if (res.status === 404) {
        setState({ kind: 'not_found' });
        return;
      }
      if (res.status === 429) {
        setState({ kind: 'rate_limited' });
        return;
      }
      if (!res.ok) {
        setState({ kind: 'error', message: `Erreur ${res.status} — réessaye dans un instant.` });
        return;
      }
      const data = (await res.json()) as StatusPayload;
      setState({ kind: 'found', status: data });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message || 'Erreur réseau' });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onCheck();
      }}
      className="space-y-5"
    >
      <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
        <header className="mb-5">
          <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-chop-red">
            01.
          </span>
          <h2 className="mt-0.5 text-[20px] font-extrabold tracking-tight text-chop-ink md:text-[22px]">
            Ton type d&apos;inscription
          </h2>
        </header>
        <fieldset className="grid grid-cols-2 gap-2">
          <RoleButton
            active={role === 'vendor'}
            onClick={() => {
              setRole('vendor');
              setState({ kind: 'idle' });
            }}
            label="🍲 Vendeur"
          />
          <RoleButton
            active={role === 'rider'}
            onClick={() => {
              setRole('rider');
              setState({ kind: 'idle' });
            }}
            label="🏍️ Livreur"
          />
        </fieldset>
      </section>

      <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
        <header className="mb-5">
          <span className="font-mono text-[11px] font-bold tabular-nums tracking-widest text-chop-red">
            02.
          </span>
          <h2 className="mt-0.5 text-[20px] font-extrabold tracking-tight text-chop-ink md:text-[22px]">
            Ton numéro WhatsApp
          </h2>
        </header>
        <PhoneInput value={phone} onChange={setPhone} />
        <Button
          type="submit"
          size="lg"
          className="mt-5 w-full"
          disabled={state.kind === 'checking'}
        >
          {state.kind === 'checking' ? 'Vérification…' : 'Vérifier mon statut'}
        </Button>
      </section>

      {state.kind === 'found' ? <ResultPanel data={state.status} role={role} /> : null}
      {state.kind === 'not_found' ? <NotFoundPanel role={role} /> : null}
      {state.kind === 'rate_limited' ? (
        <ErrorPanel message="Trop de tentatives — réessaye dans une minute." />
      ) : null}
      {state.kind === 'error' ? <ErrorPanel message={state.message} /> : null}
    </form>
  );
}

function RoleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-xl border-2 px-4 py-3 text-[14px] font-semibold transition-all',
        active
          ? 'border-chop-red bg-chop-red-light text-chop-red-dark shadow-card'
          : 'border-divider bg-chop-warm text-chop-ink hover:border-chop-red/50',
      )}
    >
      {label}
    </button>
  );
}

function ResultPanel({ data, role }: { data: StatusPayload; role: Role }) {
  const copy = STATUS_COPY[data.status];
  return (
    <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
      <span
        className={cn(
          'inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em]',
          TONE_CLASSES[copy.tone],
        )}
      >
        {copy.label}
      </span>
      <p className="mt-4 text-[15px] font-medium text-chop-ink md:text-[16px]">{copy.body}</p>

      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 border-t border-divider pt-4 text-[12px] sm:grid-cols-2">
        <DetailRow label="Soumis le" value={formatDate(data.submittedAt)} />
        {data.validatedAt ? (
          <DetailRow label="Validé le" value={formatDate(data.validatedAt)} />
        ) : null}
        {data.rejectedAt ? (
          <DetailRow label="Refusé le" value={formatDate(data.rejectedAt)} />
        ) : null}
        {data.rejectionReason ? (
          <div className="col-span-full">
            <dt className="text-[11px] font-bold uppercase tracking-widest text-chop-ink-secondary">
              Motif
            </dt>
            <dd className="mt-0.5 text-[13px] font-medium text-chop-ink">{data.rejectionReason}</dd>
          </div>
        ) : null}
      </dl>

      {data.status === 'ACTIVE' ? (
        <Button asChild className="mt-6 w-full">
          <Link href={`/login?next=/${role === 'vendor' ? 'vendor' : 'livreur'}`}>
            Se connecter au dashboard
          </Link>
        </Button>
      ) : data.status === 'REJECTED' || data.status === 'CORRECTION_REQUESTED' ? (
        <Button asChild className="mt-6 w-full">
          <Link href={role === 'vendor' ? '/vendre' : '/livrer'}>Refaire l&apos;inscription</Link>
        </Button>
      ) : null}
    </section>
  );
}

function NotFoundPanel({ role }: { role: Role }) {
  return (
    <section className="rounded-3xl bg-chop-card-white p-5 shadow-card md:p-7">
      <span className="inline-block rounded-full bg-chop-surface-gray px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-chop-ink-secondary">
        Aucune demande trouvée
      </span>
      <p className="mt-4 text-[15px] font-medium text-chop-ink md:text-[16px]">
        Aucune inscription {role === 'vendor' ? 'vendeur' : 'livreur'} n&apos;existe pour ce numéro.
        Vérifie le numéro, ou commence l&apos;inscription si tu ne l&apos;as pas encore faite.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href={role === 'vendor' ? '/vendre' : '/livrer'}>
          {role === 'vendor' ? "S'inscrire comme vendeur" : "S'inscrire comme livreur"}
        </Link>
      </Button>
    </section>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-l-4 border-chop-danger bg-chop-danger-light px-4 py-3 text-[13px] font-medium text-chop-danger">
      {message}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-widest text-chop-ink-secondary">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[13px] tabular-nums text-chop-ink">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
