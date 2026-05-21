'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  /**
   * Visual anchor. Pass an emoji string (e.g. "🍽️", "📍") or a React node
   * (e.g. an icon component). Emojis are the convention across ChopNow —
   * 🍽️ for orders/vendors, 📍 for addresses, 🛵 for rider courses.
   */
  icon: React.ReactNode;
  /** Bold one-line title — what state the user is looking at. */
  title: string;
  /** Body copy — context, encouragement, or instructions. Kept short. */
  body: string;
  /**
   * Optional CTA. Either a link (when the action navigates) or a button
   * (when the action mutates same-page state, like opening an editor).
   * Omit entirely when the empty state is a "wait" (e.g. rider waiting
   * for a dispatch offer) rather than a "do something" state.
   */
  cta?: { label: string; href: string } | { label: string; onClick: () => void };
  /** Optional className for callers that need to tweak surrounding spacing. */
  className?: string;
}

/**
 * Shared empty-state card. Replaces the ad-hoc emoji+text pattern that
 * was spread across CataloguePage, OrdersListPage, AddressesPage,
 * LivreurDashboard, and VendorDetailPage with one consistent shape.
 *
 * Visual convention: warm card on chop-card-white, oversized emoji at
 * the top, bold title, secondary body, and (optionally) a primary
 * pill button below. Mirrors the editorial frame the rest of the app
 * uses — no jarring centred spinner energy.
 */
export function EmptyState({ icon, title, body, cta, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-3xl bg-chop-card-white px-6 py-10 text-center shadow-card',
        className,
      )}
    >
      <div className="text-5xl leading-none" aria-hidden>
        {icon}
      </div>
      <h3 className="text-lg font-extrabold tracking-tight text-chop-ink">{title}</h3>
      <p className="max-w-sm text-sm text-chop-ink-secondary">{body}</p>
      {cta ? (
        'href' in cta ? (
          <Button asChild className="mt-2">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : (
          <Button type="button" onClick={cta.onClick} className="mt-2">
            {cta.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
