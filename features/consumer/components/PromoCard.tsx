'use client';

// React 19's `react-hooks/set-state-in-effect` rule bites the time-of-day
// pattern below — we deliberately compute on the client post-mount to avoid
// SSR hydration mismatch on the rotating message. Same precedent as
// features/consumer/hooks/useCatalogue.ts.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PromoCardProps {
  onClick?: () => void;
}

// Editorial promo card — a stamped poster on chop-red surface with a single
// oversized headline. No real promotions API yet, so the message rotates by
// time of day: appetite-cue copy ("Le dîner à la porte") rather than a fake
// percent-off discount.
//
// Pattern overlay uses the brand steam-wisp motif from the prototype's CSS
// data URI (`var(--pattern-steam-dark)` in landing/), but inlined here so
// chopnow-app stays self-contained.
const STEAM_PATTERN_URL =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Cpath d='M 34.3,11.3 A 13.5,13.5 0 1 0 34.3,28.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3Cpath d='M 82.3,11.3 A 13.5,13.5 0 1 0 82.3,28.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3Cpath d='M 58.3,59.3 A 13.5,13.5 0 1 0 58.3,76.7' stroke='%23FFFFFF' stroke-width='3.5' stroke-linecap='round' fill='none' opacity='0.16'/%3E%3C/svg%3E\")";

export function PromoCard({ onClick }: PromoCardProps) {
  const msg = useTimeOfDayMessage();
  return (
    <div className="px-5 pt-5 md:px-8 lg:max-w-3xl lg:px-12">
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-3xl bg-chop-red text-left text-white shadow-elevated transition-transform active:scale-[0.99]"
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage: STEAM_PATTERN_URL,
            backgroundRepeat: 'repeat',
            backgroundSize: '96px 96px',
          }}
        />
        {/* radial vignette in the bottom-right for depth */}
        <div
          aria-hidden
          className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
        />

        <div className="relative flex items-center justify-between gap-3 px-5 py-6">
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur-sm">
              {msg.kicker}
            </span>
            <h3 className="mt-2 text-[26px] font-extrabold leading-[1.05] tracking-tight">
              {msg.headline}
            </h3>
            <p className="mt-1 text-[13px] font-medium text-white/80">{msg.sub}</p>
          </div>
          <div
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-chop-red transition-transform group-hover:translate-x-0.5"
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.6} />
          </div>
        </div>
      </button>
    </div>
  );
}

interface Message {
  kicker: string;
  headline: string;
  sub: string;
}

type Slot = 'morning' | 'lunch' | 'afternoon' | 'evening';

function useTimeOfDayMessage(): Message {
  const t = useTranslations('PromoCard');
  const [slot, setSlot] = React.useState<Slot>('evening');
  React.useEffect(() => {
    const h = new Date().getHours();
    setSlot(
      h < 5 ? 'evening' : h < 11 ? 'morning' : h < 15 ? 'lunch' : h < 18 ? 'afternoon' : 'evening',
    );
  }, []);
  return {
    kicker: t(`${slot}Kicker` as const),
    headline: t(`${slot}Headline` as const),
    sub: t(`${slot}Sub` as const),
  };
}
