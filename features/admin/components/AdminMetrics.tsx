'use client';

import * as React from 'react';
import Link from 'next/link';
import { getPilotMetrics, type PilotMetrics } from '../api';
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
          className="mt-3 inline-block rounded-md bg-chop-orange px-4 py-2 text-sm font-semibold text-white"
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

      <p className="text-xs text-muted-foreground">
        Décision Semaine 3 : réachat ≥ 25% + complétion ≥ 90% → enregistrer RCCM + activer Campay
        live. Sinon, itérer ou pivoter.
      </p>
    </div>
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
