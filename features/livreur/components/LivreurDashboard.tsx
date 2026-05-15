'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRiderAvailability } from '../hooks/useRiderAvailability';
import { useRiderCourses, type RiderCourse } from '../hooks/useRiderCourses';
import { useRiderHeartbeat, type HeartbeatState } from '../hooks/useRiderHeartbeat';

/**
 * Story 4.1 / 4.2 / 4.4 — rider dashboard.
 *
 * Three concerns stacked on one screen:
 *   1. Availability toggle ("Je commence" / "Pause")
 *   2. GPS heartbeat status (active / denied / unsupported)
 *   3. Active courses list — taps through to /livreur/courses/[orderId]
 */
export function LivreurDashboard() {
  const availability = useRiderAvailability();
  const courses = useRiderCourses();
  const heartbeat = useRiderHeartbeat(availability.isOnline);

  if (courses.status === 'unauthenticated') {
    return (
      <div className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-6 text-center shadow-rider">
        <h2 className="text-xl font-extrabold">Connexion requise</h2>
        <p className="mt-2 text-sm text-white/70">
          Connecte-toi avec ton numéro de téléphone livreur.
        </p>
        <Button asChild size="jumbo" className="mt-6 w-full">
          <Link href="/login?next=/livreur">Se connecter</Link>
        </Button>
      </div>
    );
  }

  const onToggle = () => availability.setOnline(!availability.isOnline);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">Statut</p>
            <p className="mt-1 text-2xl font-extrabold">
              {availability.isOnline ? '🟢 En ligne' : '⚪ Hors ligne'}
            </p>
          </div>
          <Button
            type="button"
            size="jumbo"
            disabled={availability.setting}
            onClick={onToggle}
            variant={availability.isOnline ? 'outline' : 'default'}
          >
            {availability.setting ? '…' : availability.isOnline ? 'Pause' : 'Je commence'}
          </Button>
        </div>
        {availability.error ? (
          <p className="mt-2 text-sm text-red-300">{availability.error}</p>
        ) : null}
        <HeartbeatStatusLine state={heartbeat} isOnline={availability.isOnline} />
      </section>

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Courses du moment</h2>
          {courses.status === 'ready' ? (
            <button
              type="button"
              onClick={courses.reload}
              className="text-xs text-white/60 underline"
            >
              Actualiser
            </button>
          ) : null}
        </header>

        {courses.status === 'loading' || courses.status === 'idle' ? (
          <SkeletonList />
        ) : courses.status === 'error' ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
            {courses.message}
          </p>
        ) : courses.courses.length === 0 ? (
          <p className="rounded-lg border border-white/10 p-4 text-sm text-white/60">
            {availability.isOnline
              ? "Aucune course pour l'instant. Le dispatcher t'enverra la prochaine commande dès qu'elle arrive."
              : 'Tu es hors ligne — passe en ligne pour recevoir des courses.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {courses.courses.map((c) => (
              <li key={c.id}>
                <CourseSummaryCard course={c} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HeartbeatStatusLine({ state, isOnline }: { state: HeartbeatState; isOnline: boolean }) {
  if (!isOnline) return null;
  switch (state.status) {
    case 'starting':
      return <p className="mt-3 text-xs text-white/60">Activation du GPS…</p>;
    case 'active':
      return (
        <p className="mt-3 text-xs text-white/60">
          GPS actif · précision ±{Math.round(state.accuracyMeters)}m
        </p>
      );
    case 'denied':
      return <p className="mt-3 text-xs text-red-300">{state.message}</p>;
    case 'unsupported':
      return (
        <p className="mt-3 text-xs text-red-300">
          Ton navigateur ne supporte pas la géolocalisation.
        </p>
      );
    default:
      return null;
  }
}

function CourseSummaryCard({ course }: { course: RiderCourse }) {
  const stepLabel = labelForStep(course.status);
  return (
    <Link
      href={`/livreur/courses/${course.id}`}
      className="block rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider transition-transform active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-white/60">{course.code}</p>
          <p className="mt-1 truncate text-lg font-extrabold">{course.vendor.name}</p>
          <p className="mt-0.5 text-sm text-white/70">
            {course.vendor.quartier} → {course.deliveryQuartier}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-chop-orange px-3 py-1 text-xs font-bold text-white">
          {stepLabel}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-white/70">
        <span>{course.items?.length ?? 0} plat(s)</span>
        <span className="font-mono font-semibold">
          {course.totalXAF.toLocaleString('fr-FR')} FCFA
        </span>
      </div>
    </Link>
  );
}

function labelForStep(s: RiderCourse['status']): string {
  switch (s) {
    case 'ACCEPTED':
    case 'IN_PREP':
    case 'READY_PICKUP':
      return 'À récupérer';
    case 'PICKED_UP':
      return 'En livraison';
    default:
      return s;
  }
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-chop-dark-border bg-chop-dark-surface"
        />
      ))}
    </div>
  );
}
