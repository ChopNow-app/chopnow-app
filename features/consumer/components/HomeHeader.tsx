'use client';

// React 19's `react-hooks/set-state-in-effect` rule bites the time-of-day
// pattern below — we deliberately compute on the client post-mount to avoid
// SSR hydration mismatch on the greeting word. Same precedent as
// features/consumer/hooks/useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import { MapPin, ChevronDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeolocationState } from '../hooks/useGeolocation';

interface HomeHeaderProps {
  geo: GeolocationState;
  /**
   * Effective catalogue-coords source as resolved by `resolveCoords` in
   * useGeolocation. Lets the pill report honestly when we silently swap
   * the geolocated point for DOUALA_FALLBACK (out-of-zone, unavailable).
   * Omit on legacy callers — falls back to the older geo-only label.
   */
  coordsSource?: 'gps' | 'out-of-zone' | 'unavailable' | 'pending';
  firstName?: string | null;
  onLocationClick?: () => void;
  hasUnreadNotifications?: boolean;
}

// Editorial header: location is a small chip ABOVE the greeting; the greeting
// itself is the typographic anchor of the screen. The bell sits to the right
// in a muted neutral square so it never competes with the brand-red accent.
//
// Greeting time-of-day per local hour:
//   05–11  → Bonjour
//   12–17  → Bon après-midi
//   18–04  → Bonsoir
//
// Renders client-side so the time-of-day word + location-status dot are
// reactive to geolocation state changes without an effect on the parent.
export function HomeHeader({
  geo,
  coordsSource,
  firstName,
  onLocationClick,
  hasUnreadNotifications,
}: HomeHeaderProps) {
  const greetingWord = useTimeOfDayGreeting();

  // Pill copy follows the effective catalogue-coords source, not the raw
  // geo status, so we never lie ("Position GPS · Douala" while actually
  // querying with DOUALA_FALLBACK because the user is in Paris).
  const locationLabel =
    coordsSource === 'gps'
      ? 'Position GPS · Douala'
      : coordsSource === 'out-of-zone'
        ? 'Hors zone · Douala (centre)'
        : coordsSource === 'unavailable'
          ? 'Douala (centre)'
          : geo.status === 'requesting'
            ? 'Localisation…'
            : // legacy callers without coordsSource fall through to the geo state
              geo.status === 'ready'
              ? 'Position GPS · Douala'
              : 'Douala (centre)';
  const locationDotClass =
    coordsSource === 'gps'
      ? 'bg-emerald-500'
      : coordsSource === 'out-of-zone'
        ? 'bg-amber-400'
        : geo.status === 'requesting'
          ? 'animate-pulse bg-amber-400'
          : 'bg-chop-neutral';

  return (
    <header className="px-5 pt-6 md:px-8 lg:px-12">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onLocationClick}
            className="group inline-flex items-center gap-1.5 rounded-full bg-chop-surface-gray px-3 py-1 text-[12px] font-semibold text-chop-ink-secondary transition-colors hover:bg-chop-card-white"
          >
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', locationDotClass)} />
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
            <span>{locationLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" strokeWidth={2.4} />
          </button>

          {/* Contextual rationale: visible BEHIND the browser permission
              prompt (which is modal but transparent-edged on most browsers)
              and AFTER denial as an explanation of what the user gave up.
              Tiny, unobtrusive — doesn't shift the greeting layout. */}
          {geo.status === 'requesting' ||
          coordsSource === 'unavailable' ||
          coordsSource === 'out-of-zone' ? (
            <p className="mt-1.5 text-[11px] font-medium leading-snug text-chop-ink-secondary">
              {geo.status === 'requesting'
                ? 'On utilise ta position uniquement pour le rayon de livraison.'
                : coordsSource === 'out-of-zone'
                  ? 'Tu es hors de la zone TChopNow — on affiche les vendeurs du centre de Douala.'
                  : 'Sans position, on affiche les vendeurs du centre de Douala.'}
            </p>
          ) : null}

          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.05] tracking-tight text-chop-ink">
            {greetingWord}
            {firstName ? (
              <>
                ,<br />
                <span className="text-chop-red">{firstName}.</span>
              </>
            ) : (
              <span className="text-chop-red">.</span>
            )}
          </h1>
        </div>

        {/* Bell navigates to /notifications instead of an onClick handler
            so it's never a dead button — the previous shape required every
            caller to pass `onNotificationsClick` and CataloguePage didn't,
            so the bell silently did nothing on the live site. */}
        <Link
          href="/notifications"
          aria-label="Notifications"
          className="relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-chop-surface-gray text-chop-ink transition-colors hover:bg-chop-card-white"
        >
          <Bell className="h-5 w-5" strokeWidth={2.2} />
          {hasUnreadNotifications ? (
            <span
              aria-hidden
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-chop-red ring-2 ring-chop-warm"
            />
          ) : null}
        </Link>
      </div>
    </header>
  );
}

function useTimeOfDayGreeting() {
  // Compute on the client to avoid SSR hydration mismatch when the server
  // and client clocks straddle a boundary hour.
  const [word, setWord] = React.useState<string>('Bonsoir');
  React.useEffect(() => {
    const h = new Date().getHours();
    setWord(h < 5 ? 'Bonsoir' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir');
  }, []);
  return word;
}
