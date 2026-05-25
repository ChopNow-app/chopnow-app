'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface ActorTab {
  href: string;
  label: string;
  icon: React.ReactNode;
  /**
   * Optional predicate to mark this tab active for a path. Default is
   * exact-match on `href`. Use when a parent tab should highlight for
   * its child routes (e.g. `/admin` stays active on `/admin/users`).
   */
  match?: (path: string) => boolean;
}

export interface ActorTabNavProps {
  /** 2-6 tabs typically — UI starts to feel cramped past 6. */
  tabs: ActorTab[];
  /**
   * Paths where the tab bar should NOT render — full-screen takeover
   * views (e.g. /vendor/commande/[id]) that prefer their own chrome.
   * Same byte-wise prefix-match semantics as the consumer-nav HIDE_ON.
   */
  hideOn?: ReadonlyArray<string | RegExp>;
  /** "light" matches admin/vendor surfaces, "dark" matches livreur. */
  theme?: 'light' | 'dark';
  /** ARIA label for the nav landmark. Defaults to "Sections". */
  ariaLabel?: string;
  /** Extra className for the wrapping nav element. */
  className?: string;
}

/**
 * Horizontal tab nav shared between actor surfaces (admin / vendor).
 * Mirrors the consumer top-nav pattern but with denser "Linear/Notion
 * vibes" spacing per DESIGN.md §1.
 *
 * Layout:
 *   - `flex` row, horizontal-scrollable on narrow viewports
 *   - active tab gets a red pill; inactive hovers into surface-gray
 *   - icons + labels for at-a-glance scanability
 *
 * Caller (admin/vendor layout) is responsible for wrapping in a sticky
 * shell + sizing the container. This component is a pure tab row.
 */
export function ActorTabNav({
  tabs,
  hideOn = [],
  theme = 'light',
  ariaLabel = 'Sections',
  className,
}: ActorTabNavProps) {
  const pathname = usePathname() ?? '/';

  const hidden = hideOn.some((p) => (typeof p === 'string' ? pathname === p : p.test(pathname)));
  if (hidden) return null;

  const isDark = theme === 'dark';

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        '-mx-1 flex items-center gap-1 overflow-x-auto px-1',
        // No visible scrollbar — tabs scroll horizontally on small
        // viewports but the scrollbar would be visual noise.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.match ? tab.match(pathname) : pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
              active
                ? 'bg-chop-red text-white shadow-card'
                : isDark
                  ? 'text-white/70 hover:bg-chop-dark-surface hover:text-white'
                  : 'text-chop-ink-secondary hover:bg-chop-surface-gray hover:text-chop-ink',
            )}
          >
            <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center">
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
