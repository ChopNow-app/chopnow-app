'use client';

// React 19's `react-hooks/set-state-in-effect` rule false-flags two
// legitimate patterns we use here:
//   1. One-shot hydration from localStorage on mount
//   2. Persisting state back to localStorage on every change (subscribe-to-self)
// Both are classic "external system" syncs that the rule's own description
// allows; the lint heuristic is conservative. Disabling file-level.
/* eslint-disable react-hooks/set-state-in-effect */

import * as React from 'react';

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

interface CartDerived {
  subtotalXAF: number;
  itemCount: number;
  isEmpty: boolean;
}

const EMPTY: CartState = { vendorId: null, vendorName: null, lines: [] };

const STORAGE_KEY = 'chopnow.cart';

type CartContextValue = CartState & CartActions & CartDerived;

const CartContext = React.createContext<CartContextValue | undefined>(undefined);

function loadFromStorage(): CartState {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    // Defensive: refuse corrupt shapes rather than crash the app.
    if (typeof parsed !== 'object' || !Array.isArray(parsed.lines)) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

function saveToStorage(state: CartState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private-mode failures are non-fatal — the cart still works
    // in memory for this session.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<CartState>(EMPTY);

  // Hydrate from localStorage after mount (avoids SSR/CSR text mismatch on
  // pages that render cart counts in the header).
  React.useEffect(() => {
    setState(loadFromStorage());
  }, []);

  // Persist on every change. Use a ref-guard so the initial hydration write
  // doesn't double-write the same state.
  const hydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveToStorage(state);
  }, [state]);

  const actions = React.useMemo<CartActions>(
    () => ({
      addLine(vendorId, vendorName, line) {
        if (state.vendorId && state.vendorId !== vendorId) {
          return {
            ok: false,
            reason: 'different_vendor',
            currentVendorName: state.vendorName ?? '',
          };
        }
        const qty = line.quantity ?? 1;
        setState((prev) => {
          const existing = prev.lines.find((l) => l.itemId === line.itemId);
          if (existing) {
            return {
              ...prev,
              vendorId,
              vendorName,
              lines: prev.lines.map((l) =>
                l.itemId === line.itemId ? { ...l, quantity: l.quantity + qty } : l,
              ),
            };
          }
          return {
            ...prev,
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
        return { ok: true };
      },
      setQuantity(itemId, qty) {
        setState((prev) => {
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
        setState((prev) => {
          const lines = prev.lines.filter((l) => l.itemId !== itemId);
          return lines.length === 0 ? EMPTY : { ...prev, lines };
        });
      },
      clear() {
        setState(EMPTY);
      },
      replaceVendor(vendorId, vendorName, line) {
        const qty = line.quantity ?? 1;
        setState({
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
    [state.vendorId, state.vendorName],
  );

  const derived = React.useMemo<CartDerived>(() => {
    const subtotalXAF = state.lines.reduce((sum, l) => sum + l.priceXAF * l.quantity, 0);
    const itemCount = state.lines.reduce((sum, l) => sum + l.quantity, 0);
    return { subtotalXAF, itemCount, isEmpty: state.lines.length === 0 };
  }, [state.lines]);

  const value = React.useMemo<CartContextValue>(
    () => ({ ...state, ...actions, ...derived }),
    [state, actions, derived],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
