'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthRequired } from '@/components/ui/auth-required';
import { Button } from '@/components/ui/button';
import { useRiderAvailability } from '../hooks/useRiderAvailability';
import { useRiderCourses, type RiderCourse } from '../hooks/useRiderCourses';
import { useRiderHeartbeat, type HeartbeatState } from '../hooks/useRiderHeartbeat';
import { MesGainsCard } from './MesGainsCard';

/**
 * Story 4.1 / 4.2 / 4.4 — rider dashboard.
 *
 * Three concerns stacked on one screen:
 *   1. Availability toggle ("Je commence" / "Pause")
 *   2. GPS heartbeat status (active / denied / unsupported)
 *   3. Active courses list — taps through to /livreur/courses/[orderId]
 */
export function LivreurDashboard() {
  const t = useTranslations('Livreur');
  const tCommon = useTranslations('Common');
  const availability = useRiderAvailability();
  const courses = useRiderCourses();
  const heartbeat = useRiderHeartbeat(availability.isOnline);

  if (courses.status === 'unauthenticated') {
    return (
      <AuthRequired
        theme="dark"
        subtitle={t('authSubtitle')}
        loginHref="/login?next=/livreur"
        secondary={{ label: t('authSecondary'), href: '/livrer' }}
      />
    );
  }

  const onToggle = () => availability.setOnline(!availability.isOnline);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-chop-dark-border bg-chop-dark-surface p-4 shadow-rider">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">{t('statusLabel')}</p>
            <p className="mt-1 text-2xl font-extrabold">
              {availability.isOnline ? t('statusOnline') : t('statusOffline')}
            </p>
          </div>
          <Button
            type="button"
            size="jumbo"
            disabled={availability.setting}
            onClick={onToggle}
            variant={availability.isOnline ? 'outline' : 'default'}
          >
            {availability.setting ? '…' : availability.isOnline ? t('pauseCta') : t('goOnline')}
          </Button>
        </div>
        {availability.error ? (
          <p className="mt-2 text-sm text-red-300">{availability.error}</p>
        ) : null}
        <HeartbeatStatusLine state={heartbeat} isOnline={availability.isOnline} />
      </section>

      <MesGainsCard />

      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('coursesHeading')}</h2>
          {courses.status === 'ready' ? (
            <button
              type="button"
              onClick={courses.reload}
              className="text-xs text-white/60 underline"
            >
              {tCommon('refresh')}
            </button>
          ) : null}
        </header>

        {courses.status === 'loading' ? (
          <SkeletonList />
        ) : courses.status === 'error' ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
            {courses.message}
          </p>
        ) : courses.courses.length === 0 ? (
          <p className="rounded-lg border border-white/10 p-4 text-sm text-white/60">
            {availability.isOnline ? t('noCoursesOnline') : t('noCoursesOffline')}
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
  const t = useTranslations('Livreur');
  if (!isOnline) return null;
  switch (state.status) {
    case 'starting':
      return <p className="mt-3 text-xs text-white/60">{t('gpsStarting')}</p>;
    case 'active':
      return (
        <p className="mt-3 text-xs text-white/60">
          {t('gpsActiveTemplate', { accuracy: Math.round(state.accuracyMeters) })}
        </p>
      );
    case 'denied':
      return <p className="mt-3 text-xs text-red-300">{state.message}</p>;
    case 'unsupported':
      return <p className="mt-3 text-xs text-red-300">{t('gpsUnsupported')}</p>;
    default:
      return null;
  }
}

function CourseSummaryCard({ course }: { course: RiderCourse }) {
  const t = useTranslations('Livreur');
  const stepLabel = labelForStep(course.status, t);
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
        <span className="shrink-0 rounded-full bg-chop-red px-3 py-1 text-xs font-bold text-white">
          {stepLabel}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm text-white/70">
        <span>{t('dishesCount', { count: course.items?.length ?? 0 })}</span>
        <span className="font-mono font-semibold">
          {course.totalXAF.toLocaleString('fr-FR')} FCFA
        </span>
      </div>
    </Link>
  );
}

function labelForStep(
  s: RiderCourse['status'],
  t: ReturnType<typeof useTranslations<'Livreur'>>,
): string {
  switch (s) {
    case 'ACCEPTED':
    case 'IN_PREP':
    case 'READY_PICKUP':
      return t('stepToPickup');
    case 'PICKED_UP':
      return t('stepEnRoute');
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
