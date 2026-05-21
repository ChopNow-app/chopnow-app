'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
      <main className="container py-16 text-center">
        <h1 className="text-xl font-bold">Vendeur introuvable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ce vendeur n&apos;est plus disponible.</p>
        <Button asChild className="mt-6">
          <Link href="/restaurants">Voir d&apos;autres vendeurs</Link>
        </Button>
      </main>
    );
  }
  if (state.status === 'error') {
    return (
      <main className="container py-16 text-center">
        <p className="text-destructive">{state.message}</p>
      </main>
    );
  }

  return <VendorContent view={state.data} />;
}

function VendorContent({ view }: { view: PublicVendorView }) {
  const { vendor, categories, items } = view;
  const cart = useCart();

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

  return (
    <main className="min-h-dvh bg-chop-warm pb-32 text-chop-ink">
      <header className="container py-4">
        <Link href="/restaurants" className="text-sm text-muted-foreground">
          ← Tous les vendeurs
        </Link>
      </header>

      <section className="container space-y-4 py-2">
        <div className="flex items-start gap-4">
          {vendor.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/r2/${vendor.profilePhotoUrl}`}
              alt={vendor.name}
              className="h-20 w-20 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-background text-3xl">
              🍲
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold">{vendor.name}</h1>
            {vendor.badge ? <p className="text-sm text-muted-foreground">{vendor.badge}</p> : null}
            <p className="mt-1 text-sm text-muted-foreground">📍 {vendor.quartier}</p>
            <p className="mt-1 text-sm">
              {vendor.isOpenNow ? (
                <span className="font-semibold text-chop-mboue">Ouvert maintenant</span>
              ) : (
                <span className="font-semibold text-muted-foreground">Fermé</span>
              )}
            </p>
          </div>
        </div>

        {vendor.description ? (
          <p className="text-sm text-muted-foreground">{vendor.description}</p>
        ) : null}
      </section>

      <div className="container mt-8 space-y-8">
        {grouped.length === 0 ? (
          <EmptyState
            icon="🍳"
            title="Menu en préparation"
            body="Ce vendeur n'a pas encore publié ses plats. Reviens dans un instant — ou explore d'autres restaurants en attendant."
            cta={{ label: "Voir d'autres restaurants", href: '/restaurants' }}
          />
        ) : null}
        {grouped.map((section) => (
          <section key={section.id}>
            <h2 className="mb-3 text-lg font-bold">{section.name}</h2>
            <ul className="space-y-3">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-lg border bg-background p-3 ${
                    !item.isInStock ? 'opacity-60' : ''
                  }`}
                >
                  {item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/r2/${item.photoUrl}`}
                      alt={item.name}
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-chop-warm text-2xl">
                      🍽️
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-base font-semibold">{item.name}</h3>
                      {!item.isInStock ? (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                          Épuisé
                        </span>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    ) : null}
                    <p className="mt-1 font-semibold">{formatXAF(item.priceXAF)}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!item.isInStock || !vendor.isOpenNow}
                    onClick={() => handleAdd(item)}
                  >
                    Ajouter
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <CartFooter />
    </main>
  );
}

function CartFooter() {
  const cart = useCart();
  if (cart.isEmpty) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background shadow-lg">
      <div className="container flex items-center justify-between gap-3 py-3">
        <div className="text-sm">
          <span className="font-semibold">{cart.itemCount} plat(s)</span>
          <span className="ml-2 text-muted-foreground">
            {cart.subtotalXAF.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
        <Button asChild>
          <Link href="/cart">Voir le panier →</Link>
        </Button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <main className="min-h-dvh bg-chop-warm p-4">
      <div className="container space-y-3">
        <div className="h-20 animate-pulse rounded-lg bg-background" />
        <div className="h-32 animate-pulse rounded-lg bg-background" />
        <div className="h-32 animate-pulse rounded-lg bg-background" />
      </div>
    </main>
  );
}
