'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { track } from '@/lib/analytics';

export interface CartLine {
  itemId: string;
  name: string;
  priceXAF: number;
  photoUrl: string | null;
  quantity: number;
}

export interface CartState {
  vendorId: string | null;
  vendorName: string | null;
  lines: CartLine[];
}

interface CartActions {
  /**
   * Adds (or increments) a line. Cart is single-vendor per Story 3.1; trying
   * to add an item from a different vendor returns `{ ok: false }` so the
   * caller can show a confirm-and-replace dialog before calling
   * `replaceVendor()` to swap the cart wholesale.
   */
  addLine(
    vendorId: string,
    vendorName: string,
    line: Omit<CartLine, 'quantity'> & { quantity?: number },
  ): { ok: true } | { ok: false; reason: 'different_vendor'; currentVendorName: string };
  setQuantity(itemId: string, qty: number): void;
  removeLine(itemId: string): void;
  clear(): void;
  /** Force-replace cart contents with an item from another vendor. */
  replaceVendor(
    vendorId: string,
    vendorName: string,
    line: Omit<CartLine, 'quantity'> & { quantity?: number },
  ): void;
}

const EMPTY: CartState = { vendorId: null, vendorName: null, lines: [] };

const STORAGE_KEY = 'chopnow.cart';

/**
 * Single-vendor cart store. Persisted to localStorage by Zustand's
 * `persist` middleware, which handles SSR-safe hydration (no manual
 * `useEffect(load)` / `useRef(hydrated)` plumbing), corruption guards via
 * the `merge` hook, and tab-sync.
 *
 * `persist` lazy-initialises storage on the client, so server renders
 * always start from the EMPTY shape — no SSR/CSR text mismatch on pages
 * that read the cart count in the header.
 */
export const useCartStore = create<CartState & CartActions>()(
  persist(
    (set, get) => ({
      ...EMPTY,

      addLine(vendorId, vendorName, line) {
        const current = get();
        if (current.vendorId && current.vendorId !== vendorId) {
          return {
            ok: false,
            reason: 'different_vendor',
            currentVendorName: current.vendorName ?? '',
          };
        }
        const qty = line.quantity ?? 1;
        set((prev) => {
          const existing = prev.lines.find((l) => l.itemId === line.itemId);
          if (existing) {
            return {
              vendorId,
              vendorName,
              lines: prev.lines.map((l) =>
                l.itemId === line.itemId ? { ...l, quantity: l.quantity + qty } : l,
              ),
            };
          }
          return {
            vendorId,
            vendorName,
            lines: [
              ...prev.lines,
              {
                itemId: line.itemId,
                name: line.name,
                priceXAF: line.priceXAF,
                photoUrl: line.photoUrl,
                quantity: qty,
              },
            ],
          };
        });
        // Funnel event — fires on every add (not just first-line),
        // because re-adding from the menu signals continued intent.
        // amountXAF is the line's contribution (qty * price), used
        // for "average item price added" analysis.
        track('cart_item_added', { vendorId, amountXAF: line.priceXAF * qty });
        return { ok: true };
      },

      setQuantity(itemId, qty) {
        set((prev) => {
          if (qty <= 0) {
            const lines = prev.lines.filter((l) => l.itemId !== itemId);
            return lines.length === 0 ? EMPTY : { ...prev, lines };
          }
          return {
            ...prev,
            lines: prev.lines.map((l) => (l.itemId === itemId ? { ...l, quantity: qty } : l)),
          };
        });
      },

      removeLine(itemId) {
        set((prev) => {
          const lines = prev.lines.filter((l) => l.itemId !== itemId);
          return lines.length === 0 ? EMPTY : { ...prev, lines };
        });
      },

      clear() {
        set(EMPTY);
      },

      replaceVendor(vendorId, vendorName, line) {
        const qty = line.quantity ?? 1;
        set({
          vendorId,
          vendorName,
          lines: [
            {
              itemId: line.itemId,
              name: line.name,
              priceXAF: line.priceXAF,
              photoUrl: line.photoUrl,
              quantity: qty,
            },
          ],
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist the data shape, not the action callbacks (they're
      // re-bound on every mount). Equivalent to whitelisting fields.
      partialize: (state) => ({
        vendorId: state.vendorId,
        vendorName: state.vendorName,
        lines: state.lines,
      }),
      // Defensive: refuse corrupt shapes from older builds rather than
      // crash the cart page on load. EMPTY merges cleanly with the rest
      // of the store (actions are preserved).
      merge: (persisted, current) => {
        const safe =
          typeof persisted === 'object' &&
          persisted !== null &&
          Array.isArray((persisted as CartState).lines)
            ? (persisted as CartState)
            : EMPTY;
        return { ...current, ...safe };
      },
    },
  ),
);

interface CartDerived {
  subtotalXAF: number;
  itemCount: number;
  isEmpty: boolean;
}

/**
 * Backwards-compatible hook. Returns the same shape the old Context did
 * (state + actions + derived) so consumers don't need to update. New
 * code can use `useCartStore` directly with selectors for finer-grained
 * re-renders, but the existing two callsites only consume the whole
 * value anyway.
 */
export function useCart(): CartState & CartActions & CartDerived {
  const state = useCartStore();
  const subtotalXAF = state.lines.reduce((sum, l) => sum + l.priceXAF * l.quantity, 0);
  const itemCount = state.lines.reduce((sum, l) => sum + l.quantity, 0);
  return { ...state, subtotalXAF, itemCount, isEmpty: state.lines.length === 0 };
}
