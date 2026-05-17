'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandInput, FormSection } from '@/components/forms/onboarding-atoms';
import { cn } from '@/lib/utils';
import { DAY_KEYS, useVendorHours, type DayKey, type WeeklyHours } from '../hooks/useVendorHours';

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Lundi',
  tue: 'Mardi',
  wed: 'Mercredi',
  thu: 'Jeudi',
  fri: 'Vendredi',
  sat: 'Samedi',
  sun: 'Dimanche',
};

// Sensible defaults for a fresh row — restaurants in Douala typically open
// midday and close late. Vendor can override per-day.
const DEFAULT_OPEN = '11:00';
const DEFAULT_CLOSE = '22:00';

type Row = { enabled: boolean; open: string; close: string };

function rowsFromHours(hours: WeeklyHours): Record<DayKey, Row> {
  const out = {} as Record<DayKey, Row>;
  for (const day of DAY_KEYS) {
    const slot = hours[day];
    out[day] = slot
      ? { enabled: true, open: slot.open, close: slot.close }
      : { enabled: false, open: DEFAULT_OPEN, close: DEFAULT_CLOSE };
  }
  return out;
}

function rowsToHours(rows: Record<DayKey, Row>): WeeklyHours {
  const out: WeeklyHours = {};
  for (const day of DAY_KEYS) {
    const r = rows[day];
    if (r.enabled) out[day] = { open: r.open, close: r.close };
  }
  return out;
}

/**
 * Weekly hours editor. Mon-Sun grid; each row has an enabled toggle plus
 * two HTML5 `<input type="time">` controls. Disabled rows are dropped from
 * the payload — sending only the active days matches the DTO contract
 * (`availability.dto.ts`) where omitted keys mean "closed that day".
 *
 * Empty body `{}` is valid: it tells the backend "no schedule configured,
 * fall back to the manual Ouvert toggle". The UI surfaces this via the
 * "Aucune horaire" hint when the vendor unchecks all days.
 */
export function VendorHoursScreen() {
  const hoursState = useVendorHours();
  const [rows, setRows] = React.useState<Record<DayKey, Row> | null>(null);

  // Seed the editable rows once the API load completes. We don't bind
  // directly to the hook state because the form needs to track unsaved
  // edits (toggling a row visually before clicking Enregistrer).
  React.useEffect(() => {
    if (hoursState.status === 'ready' && rows === null) {
      setRows(rowsFromHours(hoursState.data.hours));
    }
  }, [hoursState, rows]);

  if (hoursState.status === 'loading' || hoursState.status === 'idle' || rows === null) {
    return (
      <Shell>
        <BackBar />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-chop-card-white shadow-card"
            />
          ))}
        </div>
      </Shell>
    );
  }

  if (hoursState.status === 'unauthenticated') {
    return (
      <Shell>
        <EmptyState
          title="Connexion requise"
          message="Connecte-toi pour gérer tes horaires."
          ctaHref="/login?next=/vendor/hours"
          ctaLabel="Se connecter"
        />
      </Shell>
    );
  }

  if (hoursState.status === 'error') {
    return (
      <Shell>
        <BackBar />
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {hoursState.message}
        </p>
      </Shell>
    );
  }

  const {
    isOpen,
    isOpenNow,
    error: saveError,
  } = hoursState.data
    ? { ...hoursState.data, error: hoursState.error }
    : { isOpen: false, isOpenNow: false, error: null };

  const toggle = (day: DayKey) => {
    setRows((prev) =>
      prev ? { ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } } : prev,
    );
  };
  const setTime = (day: DayKey, field: 'open' | 'close', value: string) => {
    setRows((prev) => (prev ? { ...prev, [day]: { ...prev[day], [field]: value } } : prev));
  };

  const onSave = async () => {
    try {
      await hoursState.save(rowsToHours(rows));
    } catch {
      // error already pushed into hook state — keep the form populated
    }
  };

  const anyEnabled = DAY_KEYS.some((d) => rows[d].enabled);

  return (
    <Shell>
      <BackBar />

      <header className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Mes horaires
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight">Quand es-tu ouvert ?</h1>
        </div>
        <NowChip isOpen={isOpen} isOpenNow={isOpenNow} />
      </header>

      <p className="mt-3 rounded-2xl bg-chop-warm p-3 text-[12px] font-medium leading-snug text-chop-ink-secondary">
        ⏱️ Tes horaires définissent quand les clients peuvent commander chez toi. N&apos;oublie pas
        de cliquer <span className="font-bold text-chop-ink">Ouvrir</span> sur ton tableau de bord —
        sans le toggle, tu restes invisible même pendant tes heures.
      </p>

      <div className="mt-5">
        <FormSection num="01" title="Semaine">
          <ul className="space-y-2.5">
            {DAY_KEYS.map((day) => (
              <li key={day}>
                <DayRow
                  day={day}
                  label={DAY_LABELS[day]}
                  row={rows[day]}
                  onToggle={() => toggle(day)}
                  onChangeTime={(field, value) => setTime(day, field, value)}
                />
              </li>
            ))}
          </ul>
          {!anyEnabled ? (
            <p className="mt-2 text-[12px] font-medium text-amber-700">
              Aucune horaire configurée — tu seras visible uniquement quand tu cliqueras{' '}
              <span className="font-bold">Ouvrir</span> sur le dashboard.
            </p>
          ) : null}
        </FormSection>
      </div>

      {saveError ? (
        <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {saveError}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        disabled={hoursState.saving}
        onClick={onSave}
        className="mt-5 w-full gap-2 bg-chop-red text-base shadow-card hover:bg-chop-red/90"
      >
        <Clock className="h-5 w-5" aria-hidden />
        {hoursState.saving ? '…' : 'Enregistrer'}
      </Button>

      <Link
        href="/vendor"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-chop-card-white px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-chop-surface-gray"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Retour au dashboard
      </Link>
    </Shell>
  );
}

function DayRow({
  day,
  label,
  row,
  onToggle,
  onChangeTime,
}: {
  day: DayKey;
  label: string;
  row: Row;
  onToggle: () => void;
  onChangeTime: (field: 'open' | 'close', value: string) => void;
}) {
  // Guard against malformed times (some browsers may yield "" on a blur);
  // fall back to the previous valid value via the input's required attr.
  const inputId = `hours-${day}`;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-chop-warm p-3 transition-colors',
        row.enabled ? 'border-chop-red/30 bg-chop-red-light' : 'border-divider',
      )}
    >
      <Switch checked={row.enabled} onChange={onToggle} ariaLabel={`Activer ${label}`} />
      <span
        className={cn(
          'w-20 shrink-0 text-[13px] font-bold uppercase tracking-wider',
          row.enabled ? 'text-chop-ink' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
      {row.enabled ? (
        <div className="flex flex-1 items-center gap-2">
          <BrandInput
            id={`${inputId}-open`}
            type="time"
            step={300}
            value={row.open}
            onChange={(e) => onChangeTime('open', e.target.value)}
            className="h-9 w-full max-w-[110px] text-[14px]"
          />
          <span className="text-xs font-medium text-muted-foreground">→</span>
          <BrandInput
            id={`${inputId}-close`}
            type="time"
            step={300}
            value={row.close}
            onChange={(e) => onChangeTime('close', e.target.value)}
            className="h-9 w-full max-w-[110px] text-[14px]"
          />
        </div>
      ) : (
        <span className="flex-1 text-right text-[12px] font-medium text-muted-foreground">
          Fermé
        </span>
      )}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        checked ? 'bg-chop-mboue' : 'bg-chop-neutral',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

function NowChip({ isOpen, isOpenNow }: { isOpen: boolean; isOpenNow: boolean }) {
  const label = isOpenNow ? 'Ouvert maintenant' : isOpen ? 'Hors horaire' : 'Fermé';
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        isOpenNow
          ? 'bg-chop-mboue-light text-chop-mboue'
          : isOpen
            ? 'bg-amber-100 text-amber-700'
            : 'bg-chop-surface-gray text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}

function BackBar() {
  return (
    <Link
      href="/vendor"
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-chop-card-white text-chop-ink shadow-card transition-colors hover:bg-chop-surface-gray"
      aria-label="Retour au dashboard"
    >
      <ChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-chop-surface-gray">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-12 pt-5">
        {children}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="mt-20 flex flex-col items-center text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{message}</p>
      <Button asChild className="mt-5">
        <Link href={ctaHref}>{ctaLabel}</Link>
      </Button>
    </div>
  );
}
