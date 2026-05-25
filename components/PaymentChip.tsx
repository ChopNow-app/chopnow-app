'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// Branded payment-method chip per DESIGN.md §4.
// Replaces the generic radio list on checkout — visually communicates which
// payment provider you're about to use.

type ChipKind = 'MTN_MOMO' | 'ORANGE_MONEY';

const STYLES: Record<
  ChipKind,
  {
    /** i18n keys under the `PaymentChip` namespace. */
    labelKey: 'mtnLabel' | 'orangeLabel';
    sublabelKey: 'mtnSublabel' | 'orangeSublabel';
    border: string;
    bg: string;
    selectedBg: string;
    selectedText: string;
    icon: string;
  }
> = {
  MTN_MOMO: {
    labelKey: 'mtnLabel',
    sublabelKey: 'mtnSublabel',
    border: 'border-mtn',
    bg: 'bg-mtn-light',
    selectedBg: 'bg-mtn',
    selectedText: 'text-chop-ink',
    icon: '📱',
  },
  ORANGE_MONEY: {
    labelKey: 'orangeLabel',
    sublabelKey: 'orangeSublabel',
    border: 'border-orange-money',
    bg: 'bg-orange-money-light',
    selectedBg: 'bg-orange-money',
    selectedText: 'text-white',
    icon: '📱',
  },
};

interface PaymentChipProps {
  kind: ChipKind;
  selected: boolean;
  onSelect: () => void;
}

export function PaymentChip({ kind, selected, onSelect }: PaymentChipProps) {
  const t = useTranslations('PaymentChip');
  const s = STYLES[kind];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors active:scale-[0.99]',
        s.border,
        selected ? cn(s.selectedBg, s.selectedText) : cn(s.bg, 'text-chop-ink'),
      )}
    >
      <span className="text-xl" aria-hidden="true">
        {s.icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{t(s.labelKey)}</span>
        <span className={cn('block text-xs', selected ? 'opacity-90' : 'text-muted-foreground')}>
          {t(s.sublabelKey)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2',
          selected ? 'bg-current/20 border-current' : 'border-current opacity-50',
        )}
      >
        {selected ? (
          <span className="flex h-full w-full items-center justify-center text-xs">●</span>
        ) : null}
      </span>
    </button>
  );
}
