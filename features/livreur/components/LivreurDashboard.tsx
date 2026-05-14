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
      <div className="rounded-lg border border-white/10 p-6 text-center">
        <h2 className="text-lg font-semibold">Connexion requise</h2>
        <p className="mt-2 text-sm text-white/70">
          Connecte-toi avec ton numéro de téléphone livreur.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/login?next=/livreur">Se connecter</Link>
        </Button>
      </div>
    );
  }

  const onToggle = () => availability.setOnline(!availability.isOnline);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">Statut</p>
            <p className="text-xl font-bold">
              {availability.isOnline ? '🟢 En ligne' : '⚪ Hors ligne'}
            </p>
          </div>
          <Button
            type="button"
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
      className="block rounded-lg border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-white/60">{course.code}</p>
          <p className="mt-0.5 truncate font-semibold">{course.vendor.name}</p>
          <p className="text-xs text-white/60">
            {course.vendor.quartier} → {course.deliveryQuartier}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-chop-orange/20 px-2 py-1 text-xs">
          {stepLabel}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-white/60">
        <span>{course.items.length} plat(s)</span>
        <span className="font-mono">{course.totalXAF.toLocaleString('fr-FR')} FCFA</span>
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
        <div key={i} className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/5" />
      ))}
    </div>
  );
}
