'use client';

import * as React from 'react';
import Link from 'next/link';
import { getPilotMetrics, type DispatchFunnel, type PilotMetrics } from '../api';
import { ApiClientError } from '@/lib/api/api-client';

function formatPercent(p: number): string {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
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
          const msg = err instanceof Error ? err.message : 'Erreur inconnue';
          setState({ status: 'error', message: msg });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return <p className="text-sm text-muted-foreground">Chargement des métriques…</p>;
  }

  if (state.status === 'unauthenticated') {
    return (
      <div className="rounded-lg border bg-background p-4">
        <h2 className="text-lg font-bold">Connexion admin requise</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connecte-toi avec un compte ADMIN ou SUPER_ADMIN pour voir les métriques pilote.
        </p>
        <Link
          href="/admin/login"
          className="mt-3 inline-block rounded-md bg-chop-red px-4 py-2 text-sm font-semibold text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (state.status === 'error' || !state.metrics) {
    return (
      <p className="text-sm text-destructive">
        Erreur de chargement: {state.message ?? 'données indisponibles'}
      </p>
    );
  }

  const m = state.metrics;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold">Métriques pilote</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fenêtre : {formatDate(m.window.from)} → {formatDate(m.window.to)}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard
          title="Taux de réachat (7 jours)"
          value={formatPercent(m.reorderRate.percent)}
          sub={`${m.reorderRate.reorderers} / ${m.reorderRate.uniqueCustomers} clients ont commandé ≥ 2 fois`}
          tone={m.reorderRate.percent >= 25 ? 'good' : 'neutral'}
        />
        <KpiCard
          title="Taux de complétion"
          value={formatPercent(m.completionRate.percent)}
          sub={`${m.completionRate.delivered} / ${m.completionRate.total} commandes livrées`}
          tone={m.completionRate.percent >= 90 ? 'good' : 'warn'}
        />
        <KpiCard
          title="Temps moyen de livraison"
          value={formatDuration(m.avgDeliveryTimeMs)}
          sub="Du retrait chez le vendeur à la livraison"
        />
        <KpiCard
          title="Temps moyen d'acceptation vendeur"
          value={formatDuration(m.avgVendorAcceptTimeMs)}
          sub="De la commande à l'acceptation du vendeur"
        />
      </div>

      <DispatchFunnelSection funnel={m.dispatchFunnel} />

      <p className="text-xs text-muted-foreground">
        Décision Semaine 3 : réachat ≥ 25% + complétion ≥ 90% → enregistrer RCCM + activer Campay
        live. Sinon, itérer ou pivoter.
      </p>
    </div>
  );
}

function DispatchFunnelSection({ funnel }: { funnel: DispatchFunnel }) {
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
        <h2 className="text-lg font-bold">Funnel dispatch</h2>
        <p className="text-xs text-muted-foreground">
          Santé de l&apos;attribution rider. Détails dans{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">docs/DISPATCH.md</code>.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Commandes attribuées"
          value={String(funnel.ordersAssigned)}
          sub="≥ 1 rider assigné dans la fenêtre"
        />
        <KpiCard
          title="Au 1ʳᵉ tentative"
          value={firstAttemptPct === null ? '—' : formatPercent(firstAttemptPct)}
          sub={`${funnel.assignedOnFirstAttempt} / ${funnel.ordersAssigned} commandes`}
          tone={firstAttemptPct === null ? 'neutral' : firstAttemptPct >= 85 ? 'good' : 'warn'}
        />
        <KpiCard
          title="Tentatives moyennes"
          value={funnel.avgAttemptsToAssign === null ? '—' : funnel.avgAttemptsToAssign.toFixed(2)}
          sub="Avant d'obtenir un rider"
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
          title="Expirées sans rider"
          value={String(funnel.expiredNoRider)}
          sub="10 tentatives sans candidat"
          tone={funnel.expiredNoRider === 0 ? 'good' : 'warn'}
        />
      </div>

      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top riders — offres reçues
          </p>
          {starvedRider && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
              Starved rider
            </span>
          )}
        </div>
        {funnel.topRiders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucune attribution dans la fenêtre.</p>
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
        {starvedRider && (
          <p className="mt-3 text-xs text-destructive">
            Un rider porte &gt; 70% des offres. Demande aux autres riders de se repositionner, ou
            mets temporairement le leader hors-ligne.
          </p>
        )}
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
