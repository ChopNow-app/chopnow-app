import Link from 'next/link';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AuthRequiredFeature {
  /** Emoji or icon shown in the bullet. */
  icon: React.ReactNode;
  /** Short, declarative — "Historique de tes commandes", not "Tu peux voir…". */
  label: string;
}

export interface AuthRequiredProps {
  /**
   * `light` matches consumer / vendor / admin surfaces (warm bg, ink type).
   * `dark` matches the livreur surface (deep-ink bg, white type).
   * Defaults to `light` — most surfaces.
   */
  theme?: 'light' | 'dark';
  /**
   * Headline. Defaults to "Connexion requise".
   */
  title?: string;
  /**
   * One short line of context explaining why the user is being asked to
   * sign in (e.g. "Connecte-toi pour gérer ton espace vendeur."). Strongly
   * recommended — empty gates feel cold.
   */
  subtitle?: string;
  /**
   * Where the CTA navigates. Usually `/login?next=<current path>` for
   * OTP flows, or `/admin/login` for the admin email+password flow.
   */
  loginHref: string;
  /**
   * Defaults to "Se connecter".
   */
  ctaLabel?: string;
  /**
   * Optional secondary link below the CTA — used for "Pas inscrit ?
   * Devenir vendeur" type discovery on rider/vendor surfaces.
   */
  secondary?: { label: string; href: string };
  /**
   * Optional 2-4 bullets shown below the card under a "Ce que tu débloques"
   * eyebrow. Use this on surfaces where the page would otherwise be
   * mostly-empty viewport — fills the space with concrete value teasers
   * (e.g. "Réordonner ton dernier repas en 2 taps" on /orders).
   */
  features?: AuthRequiredFeature[];
  /**
   * Optional reassurance footnote at the very bottom (e.g. "OTP par
   * WhatsApp · pas de carte bancaire requise"). Pure trust-building copy.
   */
  reassurance?: string;
  /**
   * Wrapping shell className override for callers with bespoke layouts
   * (e.g. the rider page already has its dark shell — pass empty here so
   * the component renders as a card, not a full-screen takeover).
   */
  className?: string;
}

/**
 * Shared "you need to log in" gate. Replaces ~6 hand-rolled
 * "Connexion requise" cards spread across vendor / rider / admin /
 * orders / account / cart surfaces with one consistent shape.
 *
 * Visual structure:
 *
 *   <eyebrow ("— ACCÈS")>
 *   <title (extrabold)>
 *   <subtitle (muted)>
 *   <CTA pill>
 *   <optional secondary link>
 *   ── (when features array passed) ──
 *   <eyebrow ("Ce que tu débloques")>
 *   <features list — icon + label per row>
 *   ── (when reassurance passed) ──
 *   <reassurance footnote>
 *
 * Layout: the wrapper fills `calc(100dvh - 5rem)` to claim everything
 * above the 80px bottom nav (64px nav + safe-area). With the new
 * features+reassurance content the page no longer looks anemic — even
 * without them, the flex-center makes the card sit visually anchored
 * rather than stranded near the top.
 */
export function AuthRequired({
  theme = 'light',
  title = 'Connexion requise',
  subtitle,
  loginHref,
  ctaLabel = 'Se connecter',
  secondary,
  features,
  reassurance,
  className,
}: AuthRequiredProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        // Claim the full viewport minus the 64px bottom nav + safe-area.
        // Use flex-center so the content block sits anchored in the middle
        // of available space rather than glued to the top.
        'flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center px-5 py-10',
        isDark ? 'bg-chop-deep-ink text-white' : 'bg-chop-warm text-chop-ink',
        className,
      )}
    >
      <div className="w-full max-w-md">
        {/* ── Primary card ───────────────────────────────────────── */}
        <div
          className={cn(
            'rounded-3xl p-6 text-center shadow-card md:p-8',
            isDark ? 'border border-chop-dark-border bg-chop-dark-surface' : 'bg-chop-card-white',
          )}
        >
          <p
            aria-hidden
            className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-chop-red"
          >
            — Accès
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-[26px]">{title}</h2>
          {subtitle ? (
            <p
              className={cn(
                'mx-auto mt-2 max-w-[320px] text-sm leading-relaxed',
                isDark ? 'text-white/70' : 'text-chop-ink-secondary',
              )}
            >
              {subtitle}
            </p>
          ) : null}

          <Button asChild size={isDark ? 'jumbo' : 'default'} className="mt-5 w-full">
            <Link href={loginHref}>{ctaLabel}</Link>
          </Button>

          {secondary ? (
            <Link
              href={secondary.href}
              className={cn(
                'mt-4 inline-block text-sm font-semibold underline-offset-2 hover:underline',
                isDark ? 'text-white/80' : 'text-chop-ink-secondary',
              )}
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>

        {/* ── Optional value teaser ──────────────────────────────── */}
        {features && features.length > 0 ? (
          <div className="mt-8">
            <p
              aria-hidden
              className={cn(
                'text-center text-[11px] font-extrabold uppercase tracking-[0.22em]',
                isDark ? 'text-white/55' : 'text-chop-ink-secondary',
              )}
            >
              Ce que tu débloques
            </p>
            <ul className="mt-4 space-y-2.5">
              {features.map((f, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl px-4 py-3',
                    isDark
                      ? 'border border-chop-dark-border bg-chop-dark-surface'
                      : 'border border-divider bg-chop-card-white',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base',
                      isDark ? 'bg-chop-red/15 text-chop-red' : 'bg-chop-red-light text-chop-red',
                    )}
                  >
                    {f.icon}
                  </span>
                  <span
                    className={cn(
                      'mt-1 text-[14px] font-semibold leading-snug',
                      isDark ? 'text-white' : 'text-chop-ink',
                    )}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── Optional reassurance footnote ──────────────────────── */}
        {reassurance ? (
          <p
            className={cn(
              'mt-6 text-center text-[12px] leading-relaxed',
              isDark ? 'text-white/55' : 'text-chop-ink-secondary',
            )}
          >
            {reassurance}
          </p>
        ) : null}
      </div>
    </div>
  );
}
