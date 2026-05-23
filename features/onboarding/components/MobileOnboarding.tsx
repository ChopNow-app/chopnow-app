'use client';

/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'chopnow.onboarded';

/**
 * 4-slide mobile onboarding shown on the first visit only. Replays the
 * value proposition (slides 1–3) then ends on a role picker (slide 4).
 * Swipe-driven via CSS scroll-snap; "Suivant" advances programmatically.
 * Tap-to-jump on the pagination dots.
 *
 * Persistence: localStorage flag `chopnow.onboarded`. The splash on / is
 * only suppressed for the first-visit case; once dismissed (skipped or
 * a role card tapped), the splash takes over for any future anonymous
 * visit. RoleRedirector takes priority for authenticated visits — this
 * component never paints for an authed user.
 *
 * Mobile-only by design: the desktop / tablet visitor is more likely a
 * judge / press / friend-of-the-founder, and the carousel pattern reads
 * as awkward on a wide viewport. Desktop falls back to the marketing
 * splash that already lives on this route.
 */
export function MobileOnboarding() {
  const router = useRouter();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [current, setCurrent] = React.useState(0);
  const [show, setShow] = React.useState<boolean | null>(null); // null = SSR / first paint

  const slides = SLIDES;
  const lastIndex = slides.length - 1;

  // Decide whether to mount the overlay AFTER hydration so we never flash it
  // for returning users. Carousel is gated on the installed PWA only — a
  // casual browser visit (mobile Safari, desktop Chrome, etc.) sees the
  // editorial marketing splash on the same route instead.
  //
  //   - display-mode: standalone (PWA installed)      → eligible
  //   - navigator.standalone === true (iOS fallback)  → eligible
  //   - everything else                                → splash beneath
  //
  // `?onboarding=force` is a dev-only escape hatch so I can preview the
  // carousel without reinstalling the PWA every time. NODE_ENV check
  // makes it a no-op in production — a regular user typing the query
  // param at app.tchopnow.app cannot trigger the carousel from a browser.
  //
  // Auth: this component never reaches its decision for authed users —
  // RoleRedirector replace()s the URL before this effect runs.
  React.useEffect(() => {
    try {
      const already = window.localStorage.getItem(STORAGE_KEY) === '1';
      // Read the dev escape hatch from window.location.search rather than
      // useSearchParams() — the hook forces the page into client-side
      // rendering during build, which bails out the static prerender of /.
      // We're already inside a useEffect (client-only), so the global is
      // safe and produces the same result without the build cost.
      const force =
        process.env.NODE_ENV !== 'production' &&
        new URLSearchParams(window.location.search).get('onboarding') === 'force';
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      setShow(!already && (force || isStandalone));
    } catch {
      setShow(false);
    }
  }, []);

  const goTo = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(lastIndex, idx));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== current) setCurrent(idx);
  };

  const dismiss = (href: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // private-browsing: dismiss anyway, the user can re-onboard
    }
    router.push(href);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Bienvenue chez TChopNow"
      className="fixed inset-0 z-50 flex flex-col bg-chop-warm text-chop-ink"
    >
      {/* Top bar — brand wordmark + Passer */}
      <header className="flex shrink-0 items-center justify-between px-5 pt-4">
        <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">
          TChop<span className="text-chop-red">Now.</span>
        </span>
        <button
          type="button"
          onClick={() => dismiss('/restaurants')}
          aria-label="Passer l'onboarding"
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider text-chop-ink-secondary transition-colors hover:text-chop-red"
        >
          Passer
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </header>

      {/* Swiper — full-bleed, scroll-snap horizontal */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, idx) => (
          <SlideView key={slide.key} slide={slide} isLast={idx === lastIndex} onDismiss={dismiss} />
        ))}
      </div>

      {/* Bottom CTA + dots */}
      <footer
        className="shrink-0 border-t border-divider/40 bg-chop-warm px-5 pb-6 pt-4"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)' }}
      >
        <Dots count={slides.length} current={current} onJump={goTo} />
        {current < lastIndex ? (
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-chop-ink px-5 py-3.5 text-[15px] font-bold text-white shadow-card transition-colors hover:bg-chop-ink/90"
          >
            Suivant
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </footer>
    </div>
  );
}

interface Slide {
  key: string;
  variant: 'brand' | 'step' | 'roles';
  /** Editorial chapter number on step slides, shown big in chop-red. */
  chapter?: string;
  eyebrow?: string;
  title: React.ReactNode;
  body?: string;
}

const SLIDES: Slide[] = [
  {
    key: 'brand',
    variant: 'brand',
    title: (
      <>
        Mange
        <br />
        sans
        <br />
        <span className="text-chop-red">attendre.</span>
      </>
    ),
    body: 'De la rue à ta porte. Tes vendeurs du quartier, livrés chauds en 30 minutes.',
  },
  {
    key: 'step-choose',
    variant: 'step',
    chapter: '01',
    eyebrow: 'Le vendeur',
    title: 'Choisis ton plat.',
    body: 'Maman du quartier, maquis, restaurant — tous autour de toi.',
  },
  {
    key: 'step-order',
    variant: 'step',
    chapter: '02',
    eyebrow: 'Le panier',
    title: 'Commande en 3 taps.',
    body: 'Plats, adresse, paiement à la livraison — c’est tout.',
  },
  {
    key: 'roles',
    variant: 'roles',
    title: 'Tu es ?',
    body: null!,
  },
];

function SlideView({
  slide,
  isLast: _isLast,
  onDismiss,
}: {
  slide: Slide;
  isLast: boolean;
  onDismiss: (href: string) => void;
}) {
  // Each slide takes a full viewport width via `w-full shrink-0` so
  // scroll-snap-mandatory behaves cleanly. Inside, content is centered
  // vertically with generous padding.
  return (
    <section
      aria-roledescription="slide"
      className="flex w-full shrink-0 snap-center snap-always flex-col items-center justify-center px-7 py-8"
    >
      {slide.variant === 'brand' ? <BrandSlide slide={slide} /> : null}
      {slide.variant === 'step' ? <StepSlide slide={slide} /> : null}
      {slide.variant === 'roles' ? <RolesSlide onDismiss={onDismiss} /> : null}
    </section>
  );
}

function BrandSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex h-full w-full max-w-sm flex-col justify-between">
      {/* Big editorial type — mirrors the desktop splash hero */}
      <div className="flex-1 pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
          Douala <span className="text-chop-red">·</span> Cameroun
        </p>
        <h1 className="mt-4 text-[64px] font-extrabold leading-[0.92] tracking-[-0.04em]">
          {slide.title}
        </h1>
        <p className="mt-6 text-[15px] font-medium leading-[1.55] text-chop-ink-secondary">
          {slide.body}
        </p>
      </div>

      {/* Visual flourish — the "30 minutes" promise as a typographic
          callout in the red poster. Big "30'" tabular numeral instead
          of the Clock-in-circle template anatomy. */}
      <div className="relative overflow-hidden rounded-3xl bg-chop-red p-5 text-white shadow-elevated">
        <div className="flex items-baseline gap-3">
          <span
            aria-hidden
            className="text-[44px] font-extrabold tabular-nums leading-none tracking-[-0.04em]"
          >
            30&apos;
          </span>
          <div>
            <p className="text-[13px] font-bold uppercase tracking-widest text-white/70">
              Le pacte
            </p>
            <p className="text-[16px] font-extrabold leading-tight">Trente minutes ou moins.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSlide({ slide }: { slide: Slide }) {
  return (
    <div className="flex h-full w-full max-w-sm flex-col items-start justify-center">
      {/* Editorial chapter number — replaces the lucide-icon-in-rounded-
          square that read as a v0 template. Big enough to be the visual
          anchor of the slide. */}
      <span
        aria-hidden
        className="text-[120px] font-extrabold leading-[0.82] tracking-[-0.06em] text-chop-red"
      >
        {slide.chapter}
      </span>
      <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-chop-ink-secondary">
        {slide.eyebrow}
      </p>
      <h2 className="mt-2 text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em]">
        {slide.title}
      </h2>
      <p className="mt-4 text-[16px] font-medium leading-[1.55] text-chop-ink-secondary">
        {slide.body}
      </p>
    </div>
  );
}

function RolesSlide({ onDismiss }: { onDismiss: (href: string) => void }) {
  return (
    <div className="flex h-full w-full max-w-sm flex-col justify-center">
      <h2 className="text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em]">Tu es ?</h2>
      <p className="mt-3 text-[14px] font-medium leading-[1.55] text-chop-ink-secondary">
        Choisis ton espace. Tu pourras le changer plus tard depuis ton compte.
      </p>

      <ul className="mt-7 space-y-3">
        <RoleCard
          tone="primary"
          eyebrow="01"
          label="Je commande"
          sub="Mange chaud, livré en 30 min."
          onClick={() => onDismiss('/restaurants')}
        />
        <RoleCard
          tone="default"
          eyebrow="02"
          label="Je vends mes plats"
          sub="Devenir vendeur TChopNow."
          onClick={() => onDismiss('/vendre')}
        />
        <RoleCard
          tone="default"
          eyebrow="03"
          label="Je livre à moto"
          sub="Gagner en livrant dans ton quartier."
          onClick={() => onDismiss('/livrer')}
        />
      </ul>

      <p className="mt-6 text-center text-[11px] font-medium text-chop-ink-secondary">
        Déjà inscrit ?{' '}
        <Link href="/login" className="font-semibold text-chop-red underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

function RoleCard({
  tone,
  eyebrow,
  label,
  sub,
  onClick,
}: {
  tone: 'primary' | 'default';
  eyebrow: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  const isPrimary = tone === 'primary';
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'group flex w-full items-center gap-4 rounded-2xl p-4 text-left shadow-card transition-shadow hover:shadow-elevated',
          isPrimary
            ? 'bg-chop-red text-white'
            : 'border-2 border-chop-ink/10 bg-chop-card-white text-chop-ink hover:border-chop-ink',
        )}
      >
        {/* Big editorial chapter number — replaces the lucide-icon-in-
            rounded-square. Carries enough visual weight on its own to
            anchor the row, paired with the bold label below. */}
        <span
          aria-hidden
          className={cn(
            'shrink-0 text-[28px] font-extrabold tabular-nums leading-none tracking-tight',
            isPrimary ? 'text-white/80' : 'text-chop-red',
          )}
        >
          {eyebrow}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-extrabold leading-tight tracking-tight">
            {label}
          </span>
          <span
            className={cn(
              'mt-0.5 block text-[12px] font-medium',
              isPrimary ? 'text-white/80' : 'text-chop-ink-secondary',
            )}
          >
            {sub}
          </span>
        </span>
        <ChevronRight
          className={cn(
            'h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5',
            isPrimary ? 'text-white' : 'text-chop-ink-secondary',
          )}
          aria-hidden
        />
      </button>
    </li>
  );
}

function Dots({
  count,
  current,
  onJump,
}: {
  count: number;
  current: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2" role="tablist" aria-label="Pagination">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === current;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i)}
            role="tab"
            aria-selected={active}
            aria-label={`Aller à la diapositive ${i + 1}`}
            className={cn(
              'h-1.5 rounded-full transition-all',
              active ? 'w-7 bg-chop-red' : 'w-1.5 bg-chop-neutral hover:bg-chop-ink-secondary',
            )}
          />
        );
      })}
    </div>
  );
}
