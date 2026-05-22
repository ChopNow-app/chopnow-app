import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
 * Visual structure (mirrors the livreur dashboard's existing pattern,
 * which was the best of the lot):
 *
 *   <icon (lucide LogIn)>
 *   <title (extrabold)>
 *   <subtitle (muted)>
 *   <CTA pill (jumbo on dark, primary on light)>
 *   <optional secondary link>
 *
 * Sits inside a full-bleed wrapper that centres on viewport. Each
 * caller picks `theme` to match its surrounding surface.
 */
export function AuthRequired({
  theme = 'light',
  title = 'Connexion requise',
  subtitle,
  loginHref,
  ctaLabel = 'Se connecter',
  secondary,
  className,
}: AuthRequiredProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'flex min-h-[60dvh] items-center justify-center px-6 py-12',
        isDark ? 'bg-chop-deep-ink text-white' : 'bg-chop-warm text-chop-ink',
        className,
      )}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-3xl p-6 text-center shadow-card',
          isDark ? 'border border-chop-dark-border bg-chop-dark-surface' : 'bg-chop-card-white',
        )}
      >
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            isDark ? 'bg-chop-red/15 text-chop-red' : 'bg-chop-red/10 text-chop-red',
          )}
        >
          <LogIn className="h-5 w-5" strokeWidth={2.4} aria-hidden />
        </div>
        <h2 className="mt-4 text-xl font-extrabold tracking-tight">{title}</h2>
        {subtitle ? (
          <p
            className={cn(
              'mx-auto mt-1.5 max-w-[280px] text-sm',
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
    </div>
  );
}
