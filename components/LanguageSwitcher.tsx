'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Globe, Check } from 'lucide-react';
import { setLocaleAction } from '@/lib/i18n/actions';
import { locales, type Locale } from '@/lib/i18n/config';

/**
 * FR/EN locale toggle (#168).
 *
 * Renders as a compact pill with a Globe icon + the current locale's
 * 2-letter code (FR/EN). Clicking expands a dropdown with both options;
 * picking one fires the server action, which:
 *   1. Sets the `chopnow.locale` cookie (1y)
 *   2. Calls revalidatePath() for the current pathname so the next
 *      render uses the new messages
 *
 * Mounted on every consumer surface (splash + header + footer). Lives
 * in /components rather than a route group because actor surfaces
 * (vendor, livreur, admin) also embed it.
 *
 * Why a custom dropdown instead of shadcn Select / Radix Popover?
 * We need exactly two options + an icon trigger; the radix bundle
 * would add ~12 KB for one feature. The click-outside + Esc handlers
 * here are ~20 LoC and reuse focus-visible Tailwind utilities so
 * keyboard accessibility is preserved.
 */

const LOCALE_LABELS: Record<Locale, { short: string; long: string }> = {
  fr: { short: 'FR', long: 'Français' },
  en: { short: 'EN', long: 'English' },
};

export function LanguageSwitcher({
  variant = 'default',
}: {
  /**
   * `default` — chop-warm background, dark text. For surfaces with a
   * light header (the splash, /restaurants).
   * `dark` — semi-transparent over a dark band. For the LaunchPromoBanner.
   */
  variant?: 'default' | 'dark';
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPick = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next, pathname);
    });
  };

  const triggerCls =
    variant === 'dark'
      ? 'bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white/40'
      : 'bg-chop-warm text-chop-ink hover:bg-chop-surface-gray focus-visible:ring-chop-red';

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Langue : ${LOCALE_LABELS[locale].long}`}
        disabled={pending}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${triggerCls}`}
      >
        <Globe className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
        {LOCALE_LABELS[locale].short}
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Choisir la langue"
          className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-divider bg-white py-1 shadow-elevated"
        >
          {locales.map((loc) => {
            const isActive = loc === locale;
            return (
              <li key={loc} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => onPick(loc)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-chop-warm ${
                    isActive ? 'text-chop-red' : 'text-chop-ink'
                  }`}
                >
                  <span>{LOCALE_LABELS[loc].long}</span>
                  {isActive ? <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
