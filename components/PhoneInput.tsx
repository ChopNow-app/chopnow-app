'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Country {
  /** ISO 3166-1 alpha-2 — uniqueness key. */
  code: string;
  /** Dial code without leading '+'. */
  dial: string;
  /** Flag emoji rendered in the dropdown. */
  flag: string;
  /** French display name. */
  name: string;
  /** Inline placeholder shown when this country is selected. */
  exampleLocal: string;
}

// Country list ordered by relevance to the Cameroon-diaspora user base.
// Cameroon first (the default), then top destination countries for
// Cameroonian diaspora (France, Belgium, US, Canada, Germany, Switzerland,
// UK, Italy, Spain, Netherlands), then West/Central African neighbours.
// 20 entries covers ~95% of real cases without bloating the dropdown.
const COUNTRIES: Country[] = [
  { code: 'CM', dial: '237', flag: '🇨🇲', name: 'Cameroun', exampleLocal: '6XX XXX XXX' },
  { code: 'FR', dial: '33', flag: '🇫🇷', name: 'France', exampleLocal: '6 12 34 56 78' },
  { code: 'BE', dial: '32', flag: '🇧🇪', name: 'Belgique', exampleLocal: '4XX XX XX XX' },
  { code: 'US', dial: '1', flag: '🇺🇸', name: 'États-Unis', exampleLocal: '(XXX) XXX-XXXX' },
  { code: 'CA', dial: '1', flag: '🇨🇦', name: 'Canada', exampleLocal: '(XXX) XXX-XXXX' },
  { code: 'DE', dial: '49', flag: '🇩🇪', name: 'Allemagne', exampleLocal: '1XX XXXXXXXX' },
  { code: 'CH', dial: '41', flag: '🇨🇭', name: 'Suisse', exampleLocal: '7X XXX XX XX' },
  { code: 'GB', dial: '44', flag: '🇬🇧', name: 'Royaume-Uni', exampleLocal: '7XXX XXXXXX' },
  { code: 'IT', dial: '39', flag: '🇮🇹', name: 'Italie', exampleLocal: '3XX XXX XXXX' },
  { code: 'ES', dial: '34', flag: '🇪🇸', name: 'Espagne', exampleLocal: '6XX XX XX XX' },
  { code: 'NL', dial: '31', flag: '🇳🇱', name: 'Pays-Bas', exampleLocal: '6 XXXX XXXX' },
  { code: 'SN', dial: '221', flag: '🇸🇳', name: 'Sénégal', exampleLocal: '7X XXX XX XX' },
  { code: 'CI', dial: '225', flag: '🇨🇮', name: "Côte d'Ivoire", exampleLocal: '0X XX XX XX XX' },
  { code: 'NG', dial: '234', flag: '🇳🇬', name: 'Nigeria', exampleLocal: '8XX XXX XXXX' },
  { code: 'MA', dial: '212', flag: '🇲🇦', name: 'Maroc', exampleLocal: '6XX XXXXXX' },
  { code: 'GA', dial: '241', flag: '🇬🇦', name: 'Gabon', exampleLocal: '07 XX XX XX' },
  { code: 'CD', dial: '243', flag: '🇨🇩', name: 'RDC', exampleLocal: '8XX XXX XXX' },
  { code: 'CF', dial: '236', flag: '🇨🇫', name: 'RCA', exampleLocal: '7X XX XX XX' },
  { code: 'TD', dial: '235', flag: '🇹🇩', name: 'Tchad', exampleLocal: '6X XX XX XX' },
  { code: 'CG', dial: '242', flag: '🇨🇬', name: 'Congo', exampleLocal: '06 XX XXX XX' },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Cameroun

export interface PhoneInputProps {
  /**
   * E.164 phone number (e.g. '+237670000000' or '+33695412820') OR
   * the legacy bare 9-digit Cameroon local format ('670000000') for
   * backward compat with forms that haven't migrated yet. Empty when
   * the input has no value.
   */
  value?: string;
  /**
   * Emits E.164 — '+237670000000' for Cameroon, '+33695412820' for France,
   * etc. Empty string when the input is cleared.
   */
  onChange?: (value: string) => void;
  error?: string;
  /** Visible label text. Default: "Numéro de téléphone". */
  label?: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
  id?: string;
  /** Extra className for the digits Input. */
  className?: string;
}

/** E.164 — leading '+', first digit 1-9, total 7-15 digits. */
const E164_RE = /^\+[1-9]\d{6,14}$/;

export function isValidE164(value: string): boolean {
  return E164_RE.test(value);
}

/**
 * Backwards-compat helper. Accepts both legacy 9-digit Cameroon local
 * ('670000000') AND new E.164 '+237xxxxxxxxx'. Kept as a named export
 * so any external consumers don't break, but new code should use
 * `isValidE164` instead.
 */
export function isValidCameroonPhone(value: string): boolean {
  return /^6[5-9]\d{7}$/.test(value) || /^\+2376[5-9]\d{7}$/.test(value);
}

/** Parse an inbound value into a dial code + local-digit pair. */
function parseValue(value: string): { dial: string; localDigits: string } {
  if (!value) return { dial: DEFAULT_COUNTRY.dial, localDigits: '' };
  if (value.startsWith('+')) {
    // Match longest dial prefix first so '+237' beats '+2' on a hypothetical
    // overlap. Falls back to default if nothing matches.
    const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
    for (const c of sorted) {
      if (value.startsWith(`+${c.dial}`)) {
        return { dial: c.dial, localDigits: value.slice(c.dial.length + 1) };
      }
    }
    return { dial: DEFAULT_COUNTRY.dial, localDigits: value.slice(1) };
  }
  // Legacy bare 9-digit Cameroon local — treat as +237.
  return { dial: '237', localDigits: value };
}

export function PhoneInput({
  value = '',
  onChange,
  error,
  className,
  label = 'Numéro de téléphone',
  hideLabel = false,
  id,
}: PhoneInputProps) {
  const reactId = React.useId();
  const inputId = id ?? `phone-${reactId}`;
  const errorId = `${inputId}-error`;
  const dialSelectId = `${inputId}-dial`;

  const { dial, localDigits } = parseValue(value);
  const selected = COUNTRIES.find((c) => c.dial === dial) ?? DEFAULT_COUNTRY;

  const emit = (newDial: string, rawDigits: string) => {
    const cleanDigits = rawDigits.replace(/\D/g, '');
    if (!cleanDigits) {
      onChange?.('');
      return;
    }
    onChange?.(`+${newDial}${cleanDigits}`);
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className={cn('text-sm font-semibold text-chop-ink', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        {/* Native <select> over a custom popover: native picker on mobile is
            already polished (iOS wheel / Android list), works offline, has
            built-in keyboard + screen reader support, and ships zero extra
            JS. Trade-off: less control over styling — acceptable for an
            indicator that's tapped once. */}
        <select
          id={dialSelectId}
          aria-label="Indicatif pays"
          value={dial}
          onChange={(e) => emit(e.target.value, localDigits)}
          className="h-10 shrink-0 rounded-md border border-input bg-muted px-2 text-sm font-semibold text-chop-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-chop-red"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.dial}>
              {c.flag} +{c.dial}
            </option>
          ))}
        </select>
        <Input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name="phone"
          maxLength={15}
          placeholder={selected.exampleLocal}
          value={localDigits}
          onChange={(e) => emit(dial, e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-required="true"
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
