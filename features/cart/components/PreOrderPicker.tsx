'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/**
 * Pre-order time picker (#187 — v1.1, day-ahead).
 *
 * Renders only when the vendor has `acceptsPreOrders: true`. Lets the consumer
 * toggle between "Maintenant" (immediate, today's default flow) and "Plus
 * tard" (a scheduled time within the next 24h, at least 4h away). When "Plus
 * tard" is active, a sub-toggle picks "Aujourd'hui" vs "Demain" and the slot
 * grid regenerates accordingly.
 *
 * Emits `null` upward for immediate; a Date for pre-order. Parent passes that
 * to `placeOrder` as `scheduledFor`.
 */

const MIN_LEAD_HOURS = 4;
const MAX_LEAD_HOURS = 24;

type DayChoice = 'today' | 'tomorrow';

/**
 * Build the 30-min slot grid for the picked day, clamped to:
 *   - `now + MIN_LEAD_HOURS` (lower bound)
 *   - `now + MAX_LEAD_HOURS` (upper bound)
 *   - the day boundary (00:00 local → 23:59 local for that day)
 */
function buildTimeSlots(now: Date, day: DayChoice): Date[] {
  // Earliest valid moment: at least MIN_LEAD_HOURS from now.
  const minLead = new Date(now.getTime() + MIN_LEAD_HOURS * 3600_000);
  const maxLead = new Date(now.getTime() + MAX_LEAD_HOURS * 3600_000);

  // The day window in Douala local time (UTC+1, no DST).
  // 00:00 local == 23:00 UTC of the previous day.
  const dayStartLocal = new Date(now);
  dayStartLocal.setUTCHours(-1, 0, 0, 0); // 23:00 UTC prev day == 00:00 today local
  if (day === 'tomorrow') {
    dayStartLocal.setUTCDate(dayStartLocal.getUTCDate() + 1);
  }
  const dayEndLocal = new Date(dayStartLocal);
  dayEndLocal.setUTCHours(dayEndLocal.getUTCHours() + 24);

  // Effective bounds: intersection of day window and [minLead, maxLead].
  const fromMs = Math.max(minLead.getTime(), dayStartLocal.getTime());
  const toMs = Math.min(maxLead.getTime(), dayEndLocal.getTime() - 30 * 60_000);

  // Round earliest up to the next 30-min boundary.
  const earliest = new Date(fromMs);
  const minutes = earliest.getUTCMinutes();
  if (minutes === 0 || minutes === 30) {
    earliest.setUTCSeconds(0, 0);
  } else if (minutes < 30) {
    earliest.setUTCMinutes(30, 0, 0);
  } else {
    earliest.setUTCHours(earliest.getUTCHours() + 1, 0, 0, 0);
  }

  const slots: Date[] = [];
  for (let t = earliest.getTime(); t <= toMs; t += 30 * 60_000) {
    slots.push(new Date(t));
  }
  return slots;
}

function formatSlotLocal(d: Date): string {
  // Render in Douala time (UTC+1).
  const local = new Date(d.getTime() + 3600_000);
  const hh = local.getUTCHours().toString().padStart(2, '0');
  const mm = local.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Determines which day a Date falls on in Douala local time. */
function dayOf(now: Date, d: Date): DayChoice {
  const nowLocalDay = new Date(now.getTime() + 3600_000).toISOString().slice(0, 10);
  const dLocalDay = new Date(d.getTime() + 3600_000).toISOString().slice(0, 10);
  return nowLocalDay === dLocalDay ? 'today' : 'tomorrow';
}

interface Props {
  /** Currently selected time. null = "Maintenant". */
  value: Date | null;
  onChange: (next: Date | null) => void;
}

export function PreOrderPicker({ value, onChange }: Props): React.ReactElement {
  const t = useTranslations('PreOrder');
  const [open, setOpen] = React.useState(value !== null);
  // Day defaults to whichever day the current `value` is on (so re-renders
  // don't jump tabs). When `value` is null, default to "today" unless today
  // has no available slots, in which case "tomorrow".
  const now = React.useMemo(() => new Date(), []);
  const todaySlots = React.useMemo(() => buildTimeSlots(now, 'today'), [now]);
  const tomorrowSlots = React.useMemo(() => buildTimeSlots(now, 'tomorrow'), [now]);
  const initialDay: DayChoice =
    value !== null ? dayOf(now, value) : todaySlots.length > 0 ? 'today' : 'tomorrow';
  const [day, setDay] = React.useState<DayChoice>(initialDay);
  const slots = day === 'today' ? todaySlots : tomorrowSlots;

  const noSlotsAnyDay = todaySlots.length === 0 && tomorrowSlots.length === 0;

  return (
    <div className="rounded-2xl border border-chop-red-light/60 bg-chop-card-white p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-chop-ink">
        <Clock className="h-4 w-4 text-chop-red" aria-hidden />
        {t('title')}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onChange(null);
          }}
          className={cn(
            'flex-1 rounded-full border-[1.5px] px-3 py-2 text-sm font-semibold transition-colors',
            !open
              ? 'border-chop-red bg-chop-red text-white'
              : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
          )}
        >
          {t('now')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={noSlotsAnyDay}
          className={cn(
            'flex-1 rounded-full border-[1.5px] px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            open
              ? 'border-chop-red bg-chop-red text-white'
              : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
          )}
        >
          {t('later')}
        </button>
      </div>

      {noSlotsAnyDay && open ? (
        <p className="mt-3 text-xs text-muted-foreground">{t('noSlots')}</p>
      ) : null}

      {open && !noSlotsAnyDay ? (
        <div className="mt-3 space-y-3">
          {/* Day toggle: only renders if BOTH days have slots. If today is
              fully booked (past evening), we silently lock to "tomorrow". */}
          {todaySlots.length > 0 && tomorrowSlots.length > 0 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDay('today')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  day === 'today'
                    ? 'border-chop-red bg-chop-red-light text-chop-red'
                    : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
                )}
              >
                Aujourd&apos;hui
              </button>
              <button
                type="button"
                onClick={() => setDay('tomorrow')}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  day === 'tomorrow'
                    ? 'border-chop-red bg-chop-red-light text-chop-red'
                    : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
                )}
              >
                Demain
              </button>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Choisis l&apos;heure de livraison (au moins {MIN_LEAD_HOURS}h plus tard, dans les{' '}
            {MAX_LEAD_HOURS}h) :
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((slot) => {
              const selected = value !== null && value.getTime() === slot.getTime();
              return (
                <button
                  key={slot.toISOString()}
                  type="button"
                  onClick={() => onChange(slot)}
                  className={cn(
                    'rounded-lg border px-2 py-1.5 text-xs font-semibold tabular-nums transition-colors',
                    selected
                      ? 'border-chop-red bg-chop-red text-white'
                      : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
                  )}
                >
                  {formatSlotLocal(slot)}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Une fois payée, une pré-commande ne peut être annulée que par le restaurant.
          </p>
        </div>
      ) : null}
    </div>
  );
}
