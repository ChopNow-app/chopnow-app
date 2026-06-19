'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, MapPin, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CartSheet } from '@/features/cart/components/CartSheet';
import { useCart } from '@/features/cart/store';
import { toast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { useVendorPublic } from '../hooks/useVendorPublic';
import type { PublicVendorView } from '../types';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function VendorDetailPage({ vendorId }: { vendorId: string }) {
  const t = useTranslations('VendorDetail');
  const state = useVendorPublic(vendorId);

  // Funnel event — fires once per mount of a vendor detail page.
  // Tracks the "discovery → consideration" step in the cart funnel.
  // VendorId is a public identifier, not PII.
  React.useEffect(() => {
    track('vendor_viewed', { vendorId });
  }, [vendorId]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <Skeleton />;
  }
  if (state.status === 'not_found') {
    return (
      <main className="min-h-dvh bg-chop-warm">
        <div className="container max-w-md py-16 text-center md:max-w-xl">
          <p className="text-5xl">🍽️</p>
          <h1 className="mt-4 text-xl font-extrabold">{t('notFound')}</h1>
          <p className="mt-2 text-sm text-chop-ink-secondary">{t('notFoundBody')}</p>
          <Button asChild className="mt-6">
            <Link href="/restaurants">{t('seeOthers')}</Link>
          </Button>
        </div>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container max-w-md py-16 text-center md:max-w-xl">
        <p className="text-destructive">{state.message}</p>
      </main>
    );
  }

  return <VendorContent view={state.data} />;
}

/* ------------------------------ Main view ------------------------------ */

function VendorContent({ view }: { view: PublicVendorView }) {
  const t = useTranslations('VendorDetail');
  const { vendor, categories, items } = view;
  const cart = useCart();

  // Bucket items by category. Falls back to a single "Menu" section when
  // the vendor has no categories defined; uncategorised items in a
  // mixed-mode menu get bucketed into "Autres" at the bottom.
  const grouped = React.useMemo(() => {
    if (categories.length === 0) {
      return [{ id: '__all', name: t('menuFallback'), items }];
    }
    const byCat = new Map<string | null, typeof items>();
    for (const item of items) {
      const key = item.categoryId ?? '__uncat';
      const bucket = byCat.get(key) ?? [];
      bucket.push(item);
      byCat.set(key, bucket);
    }
    const sections = categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: byCat.get(c.id) ?? [],
    }));
    const uncat = byCat.get('__uncat');
    if (uncat && uncat.length > 0) {
      sections.push({ id: '__uncat', name: t('menuOther'), items: uncat });
    }
    return sections.filter((s) => s.items.length > 0);
  }, [categories, items, t]);

  const [conflict, setConflict] = React.useState<{
    item: PublicVendorView['items'][number];
    currentVendorName: string;
  } | null>(null);

  const handleAdd = (item: PublicVendorView['items'][number]) => {
    if (!item.isInStock) return;
    const result = cart.addLine(vendor.id, vendor.name, {
      itemId: item.id,
      name: item.name,
      priceXAF: item.priceXAF,
      photoUrl: item.photoUrl,
    });
    if (!result.ok && result.reason === 'different_vendor') {
      setConflict({ item, currentVendorName: result.currentVendorName });
    }
  };

  const handleReplaceCart = () => {
    if (!conflict) return;
    const { item } = conflict;
    cart.replaceVendor(vendor.id, vendor.name, {
      itemId: item.id,
      name: item.name,
      priceXAF: item.priceXAF,
      photoUrl: item.photoUrl,
    });
    setConflict(null);
    toast({ title: t('cartReplacedToastTitle'), description: t('cartReplacedToastBody') });
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ title: vendor.name, url });
      } catch {
        // user dismissed — silent
      }
      return;
    }
    if (navigator.clipboard && url) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore
      }
    }
  };

  return (
    <main className="min-h-dvh bg-chop-warm pb-32 text-chop-ink">
      <VendorHero vendor={vendor} onShare={handleShare} />

      <div className="mx-auto w-full max-w-md px-5 md:max-w-3xl md:px-8 lg:px-0">
        <VendorMeta vendor={vendor} />

        <div className="mt-8 space-y-10">
          {grouped.length === 0 ? (
            <EmptyState
              icon="🍳"
              title={t('menuComingTitle')}
              body={t('menuComingBody')}
              cta={{ label: t('menuComingCta'), href: '/restaurants' }}
            />
          ) : null}

          {grouped.map((section) => (
            <MenuSection
              key={section.id}
              title={section.name}
              items={section.items}
              vendorOpen={vendor.isOpenNow}
              onAdd={handleAdd}
            />
          ))}
        </div>
      </div>

      <CartFooter />

      <CartConflictDialog
        open={conflict !== null}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        vendorName={conflict?.currentVendorName ?? ''}
        onKeep={() => setConflict(null)}
        onReplace={handleReplaceCart}
      />
    </main>
  );
}

/* ------------------------------ Cart conflict dialog ------------------------------ */

/**
 * Decision prompt for "cart already has another vendor's items" — replaces
 * window.confirm() (unstyled, blocks the UI, can't be localised cleanly).
 * One Radix Dialog with responsive positioning: bottom sheet on mobile
 * (where this conflict is most common — small screens, one-handed use),
 * centered modal on desktop. The actual cart swap fires a toast separately
 * (decision = modal, feedback = toast).
 */
function CartConflictDialog({
  open,
  onOpenChange,
  vendorName,
  onKeep,
  onReplace,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName: string;
  onKeep: () => void;
  onReplace: () => void;
}) {
  const t = useTranslations('VendorDetail');

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          role="alertdialog"
          className={cn(
            // Mobile: bottom sheet, full width, rounded top corners only.
            'fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-chop-card-white p-6 text-chop-ink shadow-modal',
            'pb-[calc(env(safe-area-inset-bottom)+1.5rem)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            // Desktop: centered modal, capped width, fully rounded.
            'md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[calc(100%-32px)] md:max-w-md',
            'md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:pb-6',
            'md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0',
            'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
          )}
        >
          {/* Grabber — signals "swipe down to dismiss" on mobile sheets. */}
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-chop-surface-gray md:hidden" />

          <DialogPrimitive.Title className="text-lg font-extrabold tracking-tight">
            {t('cartConflictTitle')}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 whitespace-pre-line text-sm text-chop-ink-secondary">
            {t('cartConflictBody', { vendor: vendorName })}
          </DialogPrimitive.Description>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="flex-1" onClick={onKeep}>
              {t('keepCart')}
            </Button>
            <Button type="button" className="flex-1" onClick={onReplace}>
              {t('replaceCart')}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ------------------------------ Hero ------------------------------ */

function VendorHero({
  vendor,
  onShare,
}: {
  vendor: PublicVendorView['vendor'];
  onShare: () => void;
}) {
  const t = useTranslations('VendorDetail');
  return (
    <div className="relative">
      {/* Full-bleed 16:9 hero photo with a soft dark gradient at the
          bottom so the floating "Ouvert" pill is always readable even
          on bright photos. Capped at max-w-5xl on desktop with rounded
          bottom so it doesn't span the entire viewport. */}
      <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden md:mt-4 md:rounded-3xl">
        {vendor.profilePhotoUrl ? (
          // Vendor detail hero — above-the-fold LCP candidate, so `priority`
          // tells Next.js to preload it instead of lazy-loading. `sizes`
          // caps at max-w-5xl (1024px) on desktop, fluid 100vw on mobile.
          <Image
            src={`/r2/${vendor.profilePhotoUrl}`}
            alt={vendor.name}
            fill
            priority
            sizes="(min-width: 1024px) 1024px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-chop-red/20 via-chop-warm to-chop-ink/5 text-6xl">
            🍲
          </div>
        )}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent"
        />

        {/* Floating back chip — top-left, always visible over the hero. */}
        <Link
          href="/restaurants"
          aria-label={t('backToRestaurants')}
          className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-chop-warm/95 text-chop-ink shadow-card backdrop-blur transition-colors hover:bg-chop-warm md:left-6 md:top-6"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
        </Link>

        {/* Share button — top-right counterpart. */}
        <button
          type="button"
          onClick={onShare}
          aria-label={t('share')}
          className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-chop-warm/95 text-chop-ink shadow-card backdrop-blur transition-colors hover:bg-chop-warm md:right-6 md:top-6"
        >
          <Share2 className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </button>

        {/* Open / closed pill — bottom-left, on top of the gradient. */}
        <span
          className={`absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-card md:bottom-6 md:left-6 ${
            vendor.isOpenNow ? 'bg-chop-mboue text-white' : 'bg-chop-ink/90 text-white'
          }`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              vendor.isOpenNow ? 'bg-white' : 'bg-chop-neutral'
            }`}
          />
          {vendor.isOpenNow ? t('openNow') : t('closed')}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ Meta band ------------------------------ */

function VendorMeta({ vendor }: { vendor: PublicVendorView['vendor'] }) {
  return (
    <section className="mt-6">
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-chop-ink md:text-4xl">
        {vendor.name}
      </h1>

      {/* Compact chip row: badge (e.g. "Restaurant 🍽️") + quartier.
          Each chip is intentionally low-weight so the page heading stays
          the typographic anchor. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {vendor.badge ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-chop-surface-gray px-3 py-1 text-xs font-semibold text-chop-ink">
            {vendor.badge}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-chop-surface-gray px-3 py-1 text-xs font-semibold text-chop-ink-secondary">
          <MapPin className="h-3 w-3" strokeWidth={2.4} aria-hidden />
          {vendor.quartier}
        </span>
        {/* Hours chip deferred — `vendor.hours` is a per-day struct, needs a
            "Lun-Ven 11h-22h" formatter that doesn't exist yet. Add when
            the open-hours formatter helper lands. */}
      </div>

      {vendor.description ? (
        <p className="mt-4 text-[15px] leading-relaxed text-chop-ink-secondary">
          {vendor.description}
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------ Menu sections + items ------------------------------ */

function MenuSection({
  title,
  items,
  vendorOpen,
  onAdd,
}: {
  title: string;
  items: PublicVendorView['items'];
  vendorOpen: boolean;
  onAdd: (item: PublicVendorView['items'][number]) => void;
}) {
  return (
    <section aria-label={title}>
      <h2 className="mb-4 text-lg font-extrabold tracking-tight text-chop-ink md:text-xl">
        {title}
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {items.map((item) => (
          <MenuItem key={item.id} item={item} vendorOpen={vendorOpen} onAdd={onAdd} />
        ))}
      </ul>
    </section>
  );
}

function MenuItem({
  item,
  vendorOpen,
  onAdd,
}: {
  item: PublicVendorView['items'][number];
  vendorOpen: boolean;
  onAdd: (item: PublicVendorView['items'][number]) => void;
}) {
  const t = useTranslations('VendorDetail');
  const disabled = !item.isInStock || !vendorOpen;

  return (
    <li
      className={`group relative flex items-stretch gap-3 overflow-hidden rounded-2xl border border-divider bg-chop-card-white p-3 shadow-card transition-all ${
        disabled
          ? 'opacity-60'
          : 'hover:-translate-y-0.5 hover:border-chop-ink/15 hover:shadow-elevated'
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-chop-surface-gray sm:h-28 sm:w-28">
        {item.photoUrl ? (
          // Fixed 96px (sm: 112px) square thumbnail. `sizes` is small so
          // Next serves the 128w variant — saves bytes vs. the full image.
          <Image
            src={`/r2/${item.photoUrl}`}
            alt={item.name}
            fill
            sizes="(min-width: 640px) 112px, 96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
        {!item.isInStock ? (
          <span className="absolute left-1 top-1 rounded-full bg-chop-ink/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {t('outOfStock')}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-1">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-chop-ink">{item.name}</h3>
          {item.description ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-chop-ink-secondary">
              {item.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-base font-extrabold text-chop-ink">{formatXAF(item.priceXAF)}</p>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => onAdd(item)}
            className="shrink-0"
          >
            {item.isInStock ? t('addToCart') : t('outOfStock')}
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------ Sticky cart bar ------------------------------ */

function CartFooter() {
  const t = useTranslations('VendorDetail');
  const cart = useCart();
  if (cart.isEmpty) return null;

  // The whole footer row is the SheetTrigger — tap anywhere on the bar
  // opens the cart sheet. Better hit-target than just the "Voir" button,
  // matches the Uber Eats / Glovo gesture (entire bar is interactive).
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-divider bg-chop-card-white/95 shadow-elevated backdrop-blur supports-[backdrop-filter]:bg-chop-card-white/85">
      <div
        className="mx-auto max-w-md px-5 py-3 md:max-w-3xl md:px-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <CartSheet
          trigger={
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-1.5 text-left transition-colors hover:bg-chop-surface-gray"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-chop-ink-secondary">
                  {t('cartLabel')}
                </p>
                <p className="text-sm font-extrabold text-chop-ink">
                  {t('cartItemsPlural', { count: cart.itemCount })} ·{' '}
                  {cart.subtotalXAF.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-chop-red px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-chop-red-dark">
                {t('viewCart')}
                <span aria-hidden>→</span>
              </span>
            </button>
          }
        />
      </div>
    </div>
  );
}

/* ------------------------------ Loading skeleton ------------------------------ */

function Skeleton() {
  return (
    <main className="min-h-dvh bg-chop-warm pb-32">
      <div className="mx-auto aspect-[16/9] w-full max-w-5xl animate-pulse bg-chop-surface-gray md:mt-4 md:rounded-3xl" />
      <div className="mx-auto w-full max-w-md px-5 md:max-w-3xl md:px-8 lg:px-0">
        <div className="mt-6 space-y-3">
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-chop-surface-gray" />
          <div className="flex gap-2">
            <div className="h-6 w-24 animate-pulse rounded-full bg-chop-surface-gray" />
            <div className="h-6 w-24 animate-pulse rounded-full bg-chop-surface-gray" />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl border border-divider bg-chop-card-white p-3"
            >
              <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-chop-surface-gray sm:h-28 sm:w-28" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-chop-surface-gray" />
                <div className="h-3 w-full animate-pulse rounded bg-chop-surface-gray" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-chop-surface-gray" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
