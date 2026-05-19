'use client';

import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pre-order time picker (#187 — v1, same-day only).
 *
 * Renders only when the vendor has `acceptsPreOrders: true`. Lets the consumer
 * toggle between "Maintenant" (immediate, today's default flow) and "Plus
 * tard" (a scheduled time today, at least 4h away, before 23:59 Douala).
 *
 * Emits `null` upward for immediate; a Date for pre-order. Parent passes that
 * to `placeOrder` as `scheduledFor`.
 */

const MIN_LEAD_HOURS = 4;

/** Returns Date set to today (Douala local) at `hour:minute`, in UTC. */
function todayAt(hour: number, minute: number): Date {
  const d = new Date();
  // Douala = UTC+1 with no DST. Local hour H = UTC hour H - 1.
  d.setUTCHours(hour - 1, minute, 0, 0);
  return d;
}

/** Build the time options (every 30 min) between earliest valid and end of day. */
function buildTimeSlots(now: Date): Date[] {
  const earliestMs = now.getTime() + MIN_LEAD_HOURS * 3600_000;
  // Round earliest up to the next 00 / 30 boundary so the picker shows clean times.
  const earliest = new Date(earliestMs);
  const minutes = earliest.getUTCMinutes();
  if (minutes === 0 || minutes === 30) {
    earliest.setUTCSeconds(0, 0);
  } else if (minutes < 30) {
    earliest.setUTCMinutes(30, 0, 0);
  } else {
    earliest.setUTCHours(earliest.getUTCHours() + 1, 0, 0, 0);
  }

  // End-of-day cap: 22:59 UTC == 23:59 Douala.
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(22, 30, 0, 0); // last slot at 23:30 Douala = 22:30 UTC

  const slots: Date[] = [];
  for (let t = earliest.getTime(); t <= endOfToday.getTime(); t += 30 * 60_000) {
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

interface Props {
  /** Currently selected time. null = "Maintenant". */
  value: Date | null;
  onChange: (next: Date | null) => void;
}

export function PreOrderPicker({ value, onChange }: Props): React.ReactElement {
  const [open, setOpen] = React.useState(value !== null);
  const slots = React.useMemo(() => buildTimeSlots(new Date()), []);

  const noSlotsToday = slots.length === 0;

  return (
    <div className="rounded-2xl border border-chop-red-light/60 bg-chop-card-white p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-chop-ink">
        <Clock className="h-4 w-4 text-chop-red" aria-hidden />
        Quand voulez-vous être livré ?
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
          Maintenant
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={noSlotsToday}
          className={cn(
            'flex-1 rounded-full border-[1.5px] px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50',
            open
              ? 'border-chop-red bg-chop-red text-white'
              : 'border-divider bg-chop-warm text-chop-ink-secondary hover:bg-chop-surface-gray',
          )}
        >
          Plus tard
        </button>
      </div>

      {noSlotsToday && open ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Aucun créneau disponible aujourd&apos;hui — il faut au moins {MIN_LEAD_HOURS}h
          d&apos;avance et le restaurant ferme avant ce délai. Réessaie demain matin.
        </p>
      ) : null}

      {open && !noSlotsToday ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Choisis l&apos;heure de livraison (aujourd&apos;hui, au moins {MIN_LEAD_HOURS}h plus
            tard) :
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
