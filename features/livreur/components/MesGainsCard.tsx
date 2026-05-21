'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useRiderBalance, type PayoutSummary } from '../hooks/useRiderBalance';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const DOUALA_OFFSET_MS = 3600_000;

function formatDoualaDateTime(iso: string): string {
  const utc = new Date(iso);
  const douala = new Date(utc.getTime() + DOUALA_OFFSET_MS);
  const date = douala.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });
  const hh = douala.getUTCHours().toString().padStart(2, '0');
  const mm = douala.getUTCMinutes().toString().padStart(2, '0');
  return `${date} · ${hh}h${mm}`;
}

function formatRelativePast(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 0) return 'à venir';
  const days = Math.floor(diffMs / (24 * 3600_000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

function payoutStatusLabel(status: PayoutSummary['status']): { text: string; className: string } {
  switch (status) {
    case 'PAID':
      return { text: 'payé', className: 'text-emerald-400' };
    case 'IN_FLIGHT':
      return { text: 'en cours', className: 'text-amber-400' };
    case 'PENDING':
      return { text: 'en attente', className: 'text-white/60' };
    case 'FAILED':
      return { text: 'échec', className: 'text-red-400' };
    case 'CANCELLED':
      return { text: 'annulé', className: 'text-white/60' };
    default:
      return { text: status, className: 'text-white/60' };
  }
}

/**
 * Story 7.2 — rider self-service "Mes gains" card. Same shape as the
 * vendor MonSoldeCard but adapted to the livreur's dark theme. Polls
 * every 30s via useRiderBalance. The next-payout estimate mirrors the
 * daily 06:00 Africa/Douala batch cron.
 */
export function MesGainsCard() {
  const balance = useRiderBalance();
  const [historyOpen, setHistoryOpen] = React.useState(false);

  if (balance.status === 'loading') {
    return (
      <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider">
        <p className="text-xs text-white/60">Chargement de tes gains…</p>
      </section>
    );
  }

  if (balance.status === 'error') {
    return (
      <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider">
        <h2 className="text-base font-extrabold">Mes gains</h2>
        <p className="mt-1 text-xs text-red-300">{balance.message}</p>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={balance.reload}>
          Réessayer
        </Button>
      </section>
    );
  }

  if (balance.status === 'unauthenticated') {
    return null;
  }

  const { balance: view } = balance;

  return (
    <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-white/60">Mes gains</h2>
      </header>

      <p className="mt-1 text-3xl font-extrabold tabular-nums">{formatXAF(view.balanceXAF)}</p>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-white/60">Prochain virement</dt>
          <dd className="text-right text-xs font-semibold">
            {view.nextScheduledPayout.estimatedAt ? (
              formatDoualaDateTime(view.nextScheduledPayout.estimatedAt)
            ) : (
              <span className="text-white/60">—</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-white/60">Dernier virement</dt>
          <dd className="text-right text-xs font-semibold">
            {view.lastPayoutAt && view.lastPayoutXAF !== null ? (
              <>
                {formatXAF(view.lastPayoutXAF)}{' '}
                <span className="font-normal text-white/60">
                  · {formatRelativePast(view.lastPayoutAt)}
                </span>
              </>
            ) : (
              <span className="text-white/60">Aucun pour le moment</span>
            )}
          </dd>
        </div>
      </dl>

      {view.recentPayouts.length > 0 ? (
        <div className="mt-3 border-t border-chop-dark-border pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-xs font-semibold text-white/60 hover:text-white"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            <span>Historique ({view.recentPayouts.length})</span>
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
                    <span className="text-white/60">
                      {new Date(p.periodEnd).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
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
