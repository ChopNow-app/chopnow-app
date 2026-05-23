'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CartSheet } from '@/features/cart/components/CartSheet';
import { useCart } from '@/features/cart/store';
import { useVendorPublic } from '../hooks/useVendorPublic';
import type { PublicVendorView } from '../types';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export function VendorDetailPage({ vendorId }: { vendorId: string }) {
  const state = useVendorPublic(vendorId);

  if (state.status === 'loading' || state.status === 'idle') {
    return <Skeleton />;
  }
  if (state.status === 'not_found') {
    return (
      <main className="min-h-dvh bg-chop-warm">
        <div className="container max-w-md py-16 text-center md:max-w-xl">
          <p className="text-5xl">🍽️</p>
          <h1 className="mt-4 text-xl font-extrabold">Vendeur introuvable</h1>
          <p className="mt-2 text-sm text-chop-ink-secondary">
            Ce vendeur n&apos;est plus disponible.
          </p>
          <Button asChild className="mt-6">
            <Link href="/restaurants">Voir d&apos;autres vendeurs</Link>
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
  const { vendor, categories, items } = view;
  const cart = useCart();

  // Bucket items by category. Falls back to a single "Menu" section when
  // the vendor has no categories defined; uncategorised items in a
  // mixed-mode menu get bucketed into "Autres" at the bottom.
  const grouped = React.useMemo(() => {
    if (categories.length === 0) {
      return [{ id: '__all', name: 'Menu', items }];
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
      sections.push({ id: '__uncat', name: 'Autres', items: uncat });
    }
    return sections.filter((s) => s.items.length > 0);
  }, [categories, items]);

  const handleAdd = (item: PublicVendorView['items'][number]) => {
    if (!item.isInStock) return;
    const result = cart.addLine(vendor.id, vendor.name, {
      itemId: item.id,
      name: item.name,
      priceXAF: item.priceXAF,
      photoUrl: item.photoUrl,
    });
    if (!result.ok && result.reason === 'different_vendor') {
      const ok = window.confirm(
        `Votre panier contient déjà des plats de ${result.currentVendorName}.\n\nRemplacer le panier ?`,
      );
      if (ok) {
        cart.replaceVendor(vendor.id, vendor.name, {
          itemId: item.id,
          name: item.name,
          priceXAF: item.priceXAF,
          photoUrl: item.photoUrl,
        });
      }
    }
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
              title="Menu en préparation"
              body="Ce vendeur n'a pas encore publié ses plats. Reviens dans un instant — ou explore d'autres restaurants en attendant."
              cta={{ label: "Voir d'autres restaurants", href: '/restaurants' }}
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
    </main>
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
  return (
    <div className="relative">
      {/* Full-bleed 16:9 hero photo with a soft dark gradient at the
          bottom so the floating "Ouvert" pill is always readable even
          on bright photos. Capped at max-w-5xl on desktop with rounded
          bottom so it doesn't span the entire viewport. */}
      <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden md:mt-4 md:rounded-3xl">
        {vendor.profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/r2/${vendor.profilePhotoUrl}`}
            alt={vendor.name}
            className="h-full w-full object-cover"
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
          aria-label="Retour aux restaurants"
          className="absolute left-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-chop-warm/95 text-chop-ink shadow-card backdrop-blur transition-colors hover:bg-chop-warm md:left-6 md:top-6"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} aria-hidden />
        </Link>

        {/* Share button — top-right counterpart. */}
        <button
          type="button"
          onClick={onShare}
          aria-label="Partager ce vendeur"
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
          {vendor.isOpenNow ? 'Ouvert maintenant' : 'Fermé'}
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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/r2/${item.photoUrl}`}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        )}
        {!item.isInStock ? (
          <span className="absolute left-1 top-1 rounded-full bg-chop-ink/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            Épuisé
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
            {item.isInStock ? 'Ajouter' : 'Épuisé'}
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------ Sticky cart bar ------------------------------ */

function CartFooter() {
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
                  Panier
                </p>
                <p className="text-sm font-extrabold text-chop-ink">
                  {cart.itemCount} plat{cart.itemCount > 1 ? 's' : ''} ·{' '}
                  {cart.subtotalXAF.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-chop-red px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-chop-red-dark">
                Voir le panier
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
