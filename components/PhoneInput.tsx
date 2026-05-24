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
}

// Cameroon phone: 9 digits, must start with 65–69. UX layer; API re-validates (Story 1.1).
const CAMEROON_PHONE_REGEX = /^6[5-9]\d{7}$/;

export function isValidCameroonPhone(value: string): boolean {
  return CAMEROON_PHONE_REGEX.test(value);
}

export function PhoneInput({ value = '', onChange, error, className, ...props }: PhoneInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="flex h-10 select-none items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
          +237
        </span>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          name="phone"
          maxLength={9}
          placeholder="6XX XXX XXX"
          value={value}
          onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ''))}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
