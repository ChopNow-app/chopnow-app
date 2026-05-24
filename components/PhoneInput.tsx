'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PhoneInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  /** Visible label text. Default: "Numéro de téléphone". */
  label?: string;
  /** Visually hide the label (still read by screen readers). */
  hideLabel?: boolean;
}

// Cameroon phone: 9 digits, must start with 65–69. UX layer; API re-validates (Story 1.1).
const CAMEROON_PHONE_REGEX = /^6[5-9]\d{7}$/;

export function isValidCameroonPhone(value: string): boolean {
  return CAMEROON_PHONE_REGEX.test(value);
}

export function PhoneInput({
  value = '',
  onChange,
  error,
  className,
  label = 'Numéro de téléphone',
  hideLabel = false,
  id,
  ...props
}: PhoneInputProps) {
  // Stable id for the input so the <label htmlFor> + error aria-describedby
  // resolve to the same element. Falls back to a generated id when the
  // caller doesn't pass one — React.useId is SSR-safe in Next 16.
  const reactId = React.useId();
  const inputId = id ?? `phone-${reactId}`;
  const errorId = `${inputId}-error`;
  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className={cn('text-sm font-semibold text-chop-ink', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-10 select-none items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
        >
          +237
        </span>
        <Input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name="phone"
          maxLength={9}
          placeholder="6XX XXX XXX"
          value={value}
          onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ''))}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          aria-required="true"
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
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
