'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Branded payment-method chip per DESIGN.md §4.
// Replaces the generic radio list on checkout — visually communicates which
// payment provider you're about to use.

type ChipKind = 'MTN_MOMO' | 'ORANGE_MONEY' | 'CASH';

const STYLES: Record<
  ChipKind,
  {
    label: string;
    sublabel: string;
    border: string;
    bg: string;
    selectedBg: string;
    selectedText: string;
    icon: string;
  }
> = {
  MTN_MOMO: {
    label: 'MTN Mobile Money',
    sublabel: 'Prompt USSD envoyé sur ton téléphone',
    border: 'border-mtn',
    bg: 'bg-mtn-light',
    selectedBg: 'bg-mtn',
    selectedText: 'text-chop-ink',
    icon: '📱',
  },
  ORANGE_MONEY: {
    label: 'Orange Money',
    sublabel: 'Prompt USSD envoyé sur ton téléphone',
    border: 'border-orange-money',
    bg: 'bg-orange-money-light',
    selectedBg: 'bg-orange-money',
    selectedText: 'text-white',
    icon: '📱',
  },
  CASH: {
    label: 'Cash à la livraison',
    sublabel: "Prépare l'appoint exact",
    border: 'border-cash',
    bg: 'bg-cash-light',
    selectedBg: 'bg-cash',
    selectedText: 'text-white',
    icon: '💵',
  },
};

interface PaymentChipProps {
  kind: ChipKind;
  selected: boolean;
  onSelect: () => void;
}

export function PaymentChip({ kind, selected, onSelect }: PaymentChipProps) {
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
        <span className="block text-sm font-semibold">{s.label}</span>
        <span className={cn('block text-xs', selected ? 'opacity-90' : 'text-muted-foreground')}>
          {s.sublabel}
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
