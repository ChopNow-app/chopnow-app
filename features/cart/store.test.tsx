import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { CartProvider, useCart } from './store';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

const sampleLine = (overrides?: Partial<{ itemId: string; name: string; priceXAF: number }>) => ({
  itemId: 'i-1',
  name: 'Ndolé',
  priceXAF: 2000,
  photoUrl: null,
  ...overrides,
});

describe('useCart', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') window.localStorage.clear();
  });

  it('starts empty', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotalXAF).toBe(0);
  });

  it('addLine accepts the first item from a vendor', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      const r = result.current.addLine('v-1', 'Chez Maman', sampleLine());
      expect(r).toEqual({ ok: true });
    });
    expect(result.current.vendorId).toBe('v-1');
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.subtotalXAF).toBe(2000);
  });

  it('addLine increments an existing line', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine({ priceXAF: 1500 }));
      result.current.addLine('v-1', 'Chez Maman', sampleLine({ priceXAF: 1500 }));
    });
    expect(result.current.lines[0].quantity).toBe(2);
    expect(result.current.subtotalXAF).toBe(3000);
    expect(result.current.itemCount).toBe(2);
  });

  it('addLine refuses an item from a different vendor', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine());
    });

    let attempt: { ok: boolean; reason?: string; currentVendorName?: string } | undefined;
    act(() => {
      attempt = result.current.addLine('v-2', 'Autre Cuisine', sampleLine({ itemId: 'i-2' }));
    });

    expect(attempt).toEqual({
      ok: false,
      reason: 'different_vendor',
      currentVendorName: 'Chez Maman',
    });
    expect(result.current.vendorId).toBe('v-1');
    expect(result.current.lines).toHaveLength(1);
  });

  it('replaceVendor swaps the cart wholesale', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine());
    });
    act(() => {
      result.current.replaceVendor('v-2', 'Autre', sampleLine({ itemId: 'i-2', priceXAF: 500 }));
    });
    expect(result.current.vendorId).toBe('v-2');
    expect(result.current.lines).toEqual([
      { itemId: 'i-2', name: 'Ndolé', priceXAF: 500, photoUrl: null, quantity: 1 },
    ]);
    expect(result.current.subtotalXAF).toBe(500);
  });

  it('setQuantity(0) removes the line; emptying resets vendor', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine());
    });
    act(() => {
      result.current.setQuantity('i-1', 0);
    });
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.vendorId).toBeNull();
  });

  it('setQuantity changes the count and subtotal', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine());
    });
    act(() => {
      result.current.setQuantity('i-1', 3);
    });
    expect(result.current.itemCount).toBe(3);
    expect(result.current.subtotalXAF).toBe(6000);
  });

  it('clear() empties everything', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => {
      result.current.addLine('v-1', 'Chez Maman', sampleLine());
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.isEmpty).toBe(true);
    expect(result.current.vendorId).toBeNull();
  });
});
