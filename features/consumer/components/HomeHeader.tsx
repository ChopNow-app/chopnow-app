'use client';

// React 19's `react-hooks/set-state-in-effect` rule bites the time-of-day
// pattern below — we deliberately compute on the client post-mount to avoid
// SSR hydration mismatch on the greeting word. Same precedent as
// features/consumer/hooks/useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { MapPin, ChevronDown, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeolocationState } from '../hooks/useGeolocation';

interface HomeHeaderProps {
  geo: GeolocationState;
  firstName?: string | null;
  onLocationClick?: () => void;
  onNotificationsClick?: () => void;
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
  firstName,
  onLocationClick,
  onNotificationsClick,
  hasUnreadNotifications,
}: HomeHeaderProps) {
  const greetingWord = useTimeOfDayGreeting();

  // We do not reverse-geocode yet (no Mapbox/Nominatim call). Until then the
  // pill is a one-liner that reflects the geolocation contract: GPS active,
  // approximate, or denied. Pilot zone copy ("Bonamoussadi") is the future
  // when a quartier picker lands.
  const locationLabel =
    geo.status === 'ready'
      ? 'Position GPS · Douala'
      : geo.status === 'requesting'
        ? 'Localisation…'
        : 'Douala (centre)';
  const locationDotClass =
    geo.status === 'ready'
      ? 'bg-emerald-500'
      : geo.status === 'requesting'
        ? 'animate-pulse bg-amber-400'
        : 'bg-chop-neutral';

  return (
    <header className="px-5 pt-6">
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

        <button
          type="button"
          onClick={onNotificationsClick}
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
        </button>
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
