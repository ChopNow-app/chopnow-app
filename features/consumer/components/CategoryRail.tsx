'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type CategoryId = 'all' | 'grill' | 'local' | 'fast' | 'healthy' | 'drinks';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Substring patterns matched against vendor name/badge for client-side filtering. */
  match: string[];
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'Tout', emoji: '🍽️', match: [] },
  {
    id: 'grill',
    label: 'Grillades',
    emoji: '🍗',
    match: ['grill', 'viande', 'poulet', 'porc', 'brochette'],
  },
  {
    id: 'local',
    label: 'Local',
    emoji: '🥘',
    match: ['ndolé', 'ndole', 'koki', 'eru', 'achu', 'okok', 'local', 'tradition'],
  },
  {
    id: 'fast',
    label: 'Fast food',
    emoji: '🍔',
    match: ['burger', 'pizza', 'sandwich', 'fast', 'shawarma'],
  },
  { id: 'healthy', label: 'Sain', emoji: '🥗', match: ['salade', 'sain', 'bio', 'vegan', 'jus'] },
  {
    id: 'drinks',
    label: 'Boissons',
    emoji: '🥤',
    match: ['boisson', 'smoothie', 'cocktail', 'juice', 'café', 'thé'],
  },
];

interface CategoryRailProps {
  selected: CategoryId;
  onChange: (next: CategoryId) => void;
}

// Horizontally scrolling category rail. Each chip carries a 2-digit index
// number above the label — a small magazine-TOC affordance that makes the
// row feel curated rather than thrown-together. Selected chip flips to
// dark surface with a red dot ⟂ the label, reserving the brand-red accent.
export function CategoryRail({ selected, onChange }: CategoryRailProps) {
  return (
    <nav aria-label="Catégories" className="pt-5">
      <ul
        className={cn(
          'flex gap-2 overflow-x-auto px-5 pb-1 md:px-8 lg:px-12',
          // Hide the native scrollbar — visual rhythm is enough of a hint.
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {CATEGORIES.map((cat, idx) => {
          const active = cat.id === selected;
          return (
            <li key={cat.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onChange(cat.id)}
                aria-pressed={active}
                className={cn(
                  'group relative flex flex-col items-start gap-0.5 rounded-2xl px-3.5 py-2.5 transition-all',
                  active
                    ? 'bg-chop-ink text-white shadow-elevated'
                    : 'bg-chop-card-white text-chop-ink hover:bg-chop-surface-gray',
                )}
              >
                <span
                  className={cn(
                    'flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                    active ? 'text-white/60' : 'text-chop-ink-secondary/70',
                  )}
                >
                  {String(idx + 1).padStart(2, '0')}
                  {active ? (
                    <span aria-hidden className="h-1 w-1 rounded-full bg-chop-red" />
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <span aria-hidden>{cat.emoji}</span>
                  {cat.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
