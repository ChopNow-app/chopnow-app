'use client';

import * as React from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useCart, type CartLine } from '@/features/cart/store';

const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/**
 * Slide-up cart preview. Replaces the "tap footer → navigate to /cart"
 * full-page transition with an inline sheet so the consumer can review
 * + adjust quantities without losing their place on the vendor menu.
 *
 * Checkout (address + payment) still lives at /cart — this sheet is the
 * peek-and-confirm step.
 *
 * `trigger` is whatever element the caller wants to surface as the
 * tap target. On VendorDetailPage that's the fixed-bottom CartFooter;
 * elsewhere it could be the bottom-nav badge.
 */
export function CartSheet({ trigger }: { trigger: React.ReactNode }) {
  const cart = useCart();
  const [open, setOpen] = React.useState(false);

  // Auto-close when cart empties (user removed last line). Without this
  // the sheet stays open showing nothing — canonical "sync React state
  // to external store" pattern: the cart store is the external system,
  // the sheet's open boolean follows it.
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && cart.isEmpty) setOpen(false);
  }, [open, cart.isEmpty]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl border-0 bg-chop-warm px-5 pb-8 pt-6"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl font-extrabold tracking-tight text-chop-ink">
            Ton panier
          </SheetTitle>
          <SheetDescription className="text-sm text-chop-ink-secondary">
            {cart.vendorName ? `Chez ${cart.vendorName}` : ''}
          </SheetDescription>
        </SheetHeader>

        <ul className="mt-4 space-y-3">
          {cart.lines.map((line) => (
            <CartLineRow key={line.itemId} line={line} />
          ))}
        </ul>

        <div className="mt-6 flex items-baseline justify-between border-t border-divider pt-4">
          <span className="text-base font-semibold text-chop-ink-secondary">Sous-total</span>
          <span className="text-xl font-extrabold tabular-nums text-chop-ink">
            {formatXAF(cart.subtotalXAF)}
          </span>
        </div>
        <p className="mt-1 text-xs text-chop-ink-secondary">
          Frais de livraison ajoutés à l&apos;étape suivante.
        </p>

        <Button asChild className="mt-5 h-12 w-full text-base font-bold">
          <Link href="/cart" onClick={() => setOpen(false)}>
            Commander & payer
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function CartLineRow({ line }: { line: CartLine }) {
  const cart = useCart();

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-chop-card-white p-3 shadow-card">
      {line.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/r2/${line.photoUrl}`}
          alt={line.name}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-chop-surface-gray text-2xl"
        >
          🍽️
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-chop-ink">{line.name}</p>
        <p className="mt-0.5 text-xs font-semibold text-chop-red">
          {formatXAF(line.priceXAF * line.quantity)}
        </p>

        <div className="mt-1.5 flex items-center gap-1">
          <QtyButton
            label="Diminuer"
            onClick={() => cart.setQuantity(line.itemId, line.quantity - 1)}
          >
            {line.quantity === 1 ? (
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
            ) : (
              <Minus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
          </QtyButton>
          <span className="min-w-6 text-center text-sm font-bold tabular-nums">
            {line.quantity}
          </span>
          <QtyButton
            label="Augmenter"
            onClick={() => cart.setQuantity(line.itemId, line.quantity + 1)}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          </QtyButton>
        </div>
      </div>
    </li>
  );
}

function QtyButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full bg-chop-surface-gray text-chop-ink transition-colors hover:bg-chop-red hover:text-white"
    >
      {children}
    </button>
  );
}
