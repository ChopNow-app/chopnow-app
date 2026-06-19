'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTranslations } from 'next-intl';
import { AuthRequired } from '@/components/ui/auth-required';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaymentChip } from '@/components/PaymentChip';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRaw } from '@/lib/api/api-client';
import { auth } from '@/lib/auth';
import { useVendorPublic } from '@/features/consumer/hooks/useVendorPublic';
import { useCart } from '../store';
import { useAddresses, type SavedAddress } from '../hooks/useAddresses';
import { toast } from '@/hooks/use-toast';
import { track } from '@/lib/analytics';
import {
  initiateMomo,
  placeOrder,
  validateCoupon,
  type PaymentMethod,
  type ValidatedCoupon,
} from '../api';
import { PreOrderPicker } from './PreOrderPicker';

/**
 * Fetch the authenticated user's phone once on mount. Used as the final
 * fallback for `deliveryPhone` when the picked address has none — the
 * backend requires one and we'd rather pass the account phone than fail
 * the submit. Returns null while loading or if unauthenticated.
 */
function useUserPhone(): string | null {
  const [phone, setPhone] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    apiRaw
      .get<{ phone: string }>('/api/v1/users/me')
      .then((u) => {
        if (!cancelled) setPhone(u.phone ?? null);
      })
      .catch(() => {
        if (!cancelled) setPhone(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return phone;
}

const MIN_ORDER_XAF = 1200;
const formatXAF = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;
// Render a Date as HH:MM in Douala local time (UTC+1, no DST). Matches the
// PreOrderPicker's slot labels so the sticky CTA echo is consistent.
const formatLocalHHMM = (d: Date): string => {
  const local = new Date(d.getTime() + 3600_000);
  const hh = local.getUTCHours().toString().padStart(2, '0');
  const mm = local.getUTCMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

// Pilot is MoMo-only (MTN MoMo + Orange Money). The cash-on-delivery branch
// + the PILOT_COD_ONLY flag were removed 2026-05-18 (chopnow-api issue #177).
const PAYMENT_OPTIONS: ReadonlyArray<{ id: PaymentMethod }> = [
  { id: 'MTN_MOMO' },
  { id: 'ORANGE_MONEY' },
];

const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'MTN_MOMO';

export function CartPage() {
  const t = useTranslations('Cart');
  const cart = useCart();
  const router = useRouter();
  const addresses = useAddresses();
  const userPhone = useUserPhone();

  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [noteForVendor, setNoteForVendor] = React.useState('');
  const [payerPhone, setPayerPhone] = React.useState('');
  const [userPickedAddressId, setUserPickedAddressId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Pre-orders (#187): null = immediate (today's flow). Set = scheduled time.
  // Only available when the vendor has acceptsPreOrders=true.
  const [scheduledFor, setScheduledFor] = React.useState<Date | null>(null);

  // Promo coupon (#167) — user-typed code, validated against the backend
  // before submit. The frontend doesn't know the delivery fee (server-
  // computed at order time), so we send `deliveryFeeXAF: 0` to /validate
  // and rely on the textual "Livraison gratuite" wording rather than a
  // specific XAF reduction. Backend re-validates atomically inside the
  // order-creation transaction; the worst case is a /validate "ok" then
  // a POST /orders "coupon_already_redeemed" if a concurrent submit
  // raced us — handled by the existing submit-error toast.
  const [couponInput, setCouponInput] = React.useState('');
  const [couponValidating, setCouponValidating] = React.useState(false);
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = React.useState<ValidatedCoupon | null>(null);
  const vendorView = useVendorPublic(cart.vendorId);
  const acceptsPreOrders =
    vendorView.status === 'ready' && vendorView.data.vendor.acceptsPreOrders === true;

  // Derived default selection — if the user hasn't picked one yet, fall back
  // to the marked-default or the first address. Cleaner than a useEffect +
  // setState that the React 19 lint flags.
  const selectedAddressId = React.useMemo(() => {
    if (userPickedAddressId) return userPickedAddressId;
    if (addresses.status !== 'ready' || addresses.addresses.length === 0) return null;
    const def = addresses.addresses.find((a) => a.isDefault) ?? addresses.addresses[0];
    return def.id;
  }, [addresses, userPickedAddressId]);
  const setSelectedAddressId = setUserPickedAddressId;

  if (addresses.status === 'unauthenticated') {
    return <AuthRequiredPanel />;
  }

  if (cart.isEmpty) {
    return (
      <main className="container max-w-2xl py-16 text-center">
        <h1 className="text-xl font-bold">{t('empty')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('emptyBody')}</p>
        <Button asChild className="mt-6">
          <Link href="/restaurants">{t('browseVendors')}</Link>
        </Button>
      </main>
    );
  }

  const selectedAddress =
    addresses.status === 'ready'
      ? (addresses.addresses.find((a) => a.id === selectedAddressId) ?? null)
      : null;

  const belowMinimum = cart.subtotalXAF < MIN_ORDER_XAF;
  // payerPhone is always required now (every order is MoMo).
  const canSubmit =
    !belowMinimum &&
    !submitting &&
    selectedAddress !== null &&
    /^(?:6[5-9]\d{7}|\+?[1-9]\d{7,14})$/.test(payerPhone);

  const onApplyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponError(null);
    setCouponValidating(true);
    try {
      // deliveryFeeXAF is 0 here because the cart doesn't yet have the
      // server-computed delivery fee. The backend's FREE_DELIVERY
      // discount path returns 0 in that case, so we don't show a
      // numeric reduction — only the textual "Livraison gratuite".
      const result = await validateCoupon(code, cart.subtotalXAF, 0);
      setAppliedCoupon(result);
      setCouponInput(result.code);
      track('coupon_applied', { code: result.code, type: result.type });
    } catch (err) {
      const e = err as Error & { code?: string };
      setCouponError(e.message);
      setAppliedCoupon(null);
      track('coupon_rejected', { code, errorCode: e.code ?? 'unknown' });
    } finally {
      setCouponValidating(false);
    }
  };

  const onClearCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const onSubmit = async () => {
    if (!selectedAddress || !cart.vendorId) return;
    setSubmitError(null);
    setSubmitting(true);
    // Funnel event — fires the moment the user commits to checkout
    // (button click + validation passes). Pairs with order_placed /
    // order_failed below for "started → completed" conversion.
    track('checkout_started', {
      paymentMethod,
      amountXAF: cart.subtotalXAF,
      itemCount: cart.lines.length,
    });
    try {
      const order = await placeOrder(
        {
          vendorId: cart.vendorId,
          items: cart.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
          paymentMethod,
          noteForVendor: noteForVendor.trim() || undefined,
          deliveryLat: selectedAddress.lat,
          deliveryLng: selectedAddress.lng,
          deliveryQuartier: selectedAddress.quartier ?? t('quartierUnknown'),
          deliveryLandmark: undefined,
          deliveryDescription: selectedAddress.description ?? undefined,
          deliveryPhone:
            selectedAddress.phone ||
            (payerPhone.length > 0 ? payerPhone : undefined) ||
            userPhone ||
            '',
          // Pre-orders (#187): only sent when the user picked "Plus tard"
          // AND the vendor accepts pre-orders. Backend re-validates both.
          scheduledFor: scheduledFor && acceptsPreOrders ? scheduledFor.toISOString() : undefined,
          // Promo coupon (#167) — only sent when the consumer applied
          // a valid code AT THIS CART. Backend re-validates atomically
          // inside the order-creation transaction; if invalidated by
          // a race (concurrent submit, expiry), the order errors out
          // with the structured `code` field.
          couponCode: appliedCoupon?.code,
        },
        crypto.randomUUID(),
      );

      await initiateMomo(order.id, payerPhone);

      cart.clear();
      // Funnel event — order successfully created AND MoMo prompt
      // dispatched. Backend webhook will later transition status
      // to CONFIRMED; we don't track that here (server-side concern,
      // captured in chopnow-api's Prometheus metrics).
      track('order_placed', { paymentMethod, amountXAF: order.totalXAF });
      toast({
        variant: 'success',
        title: t('toastSentTitle'),
        description: t('toastSentBody', { code: order.code }),
      });
      router.replace(`/orders/${order.id}`);
    } catch (err) {
      const msg = (err as Error).message ?? t('submitErrorFallback');
      // Funnel event — DROPOUT signal. The errorCode comes from the
      // structured backend error (extractCode in features/cart/api.ts);
      // raw err.message can contain PII fragments so we use the code.
      const errorCode = (err as { code?: string }).code ?? 'unknown';
      track('order_failed', { paymentMethod, errorCode });
      setSubmitError(msg);
      toast({ variant: 'error', title: t('toastErrorTitle'), description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh bg-chop-warm pb-40 text-chop-ink">
      <header className="container max-w-2xl py-4">
        <Link
          href={cart.vendorId ? `/vendors/${cart.vendorId}` : '/restaurants'}
          className="text-sm text-muted-foreground"
        >
          {t('continueShopping')}
        </Link>
      </header>

      <section className="container max-w-2xl space-y-6 py-2">
        <h1 className="text-2xl font-extrabold">{t('title')}</h1>
        {cart.vendorName ? (
          <p className="text-sm text-muted-foreground">
            {/^chez\b/i.test(cart.vendorName)
              ? cart.vendorName
              : `${t('vendorPrefix')}${cart.vendorName}`}
          </p>
        ) : null}

        <ul className="space-y-2">
          {cart.lines.map((line) => (
            <li
              key={line.itemId}
              className="flex items-center gap-3 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{line.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatXAF(line.priceXAF)} {t('unitSuffix')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cart.setQuantity(line.itemId, line.quantity - 1)}
                  aria-label={t('decreaseAria', { name: line.name })}
                >
                  −
                </Button>
                <span className="w-6 text-center font-semibold">{line.quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cart.setQuantity(line.itemId, line.quantity + 1)}
                  aria-label={t('increaseAria', { name: line.name })}
                >
                  +
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border bg-background p-3 text-sm">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span className="font-semibold">{formatXAF(cart.subtotalXAF)}</span>
          </div>
          {belowMinimum ? (
            <p className="mt-2 text-destructive">{t('belowMinimum', { min: MIN_ORDER_XAF })}</p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">{t('deliveryFeeNote')}</p>
          )}
        </div>

        <AddressPicker
          state={addresses}
          selectedAddressId={selectedAddressId}
          onSelect={setSelectedAddressId}
        />

        {acceptsPreOrders ? (
          <PreOrderPicker value={scheduledFor} onChange={setScheduledFor} />
        ) : null}

        <CouponPanel
          input={couponInput}
          onInputChange={setCouponInput}
          applied={appliedCoupon}
          validating={couponValidating}
          error={couponError}
          onApply={onApplyCoupon}
          onClear={onClearCoupon}
        />

        <section role="radiogroup" aria-label={t('paymentMethod')}>
          <h2 className="mb-2 text-sm font-semibold">{t('paymentMethod')}</h2>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <PaymentChip
                key={opt.id}
                kind={opt.id}
                selected={paymentMethod === opt.id}
                onSelect={() => setPaymentMethod(opt.id)}
              />
            ))}
          </div>
        </section>

        <div>
          <label htmlFor="payerPhone" className="mb-1 block text-sm font-semibold">
            {t('payerPhoneLabel')}
          </label>
          <Input
            id="payerPhone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            name="payerPhone"
            placeholder="670000000"
            value={payerPhone}
            onChange={(e) => setPayerPhone(e.target.value.replace(/\s+/g, ''))}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {paymentMethod === 'MTN_MOMO' ? t('payerPhoneHelpMtn') : t('payerPhoneHelpOrange')}
          </p>
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-semibold">
            {t('noteLabel')}{' '}
            <span className="text-xs text-muted-foreground">{t('noteOptional')}</span>
          </label>
          <Input
            id="note"
            placeholder={t('notePlaceholder')}
            maxLength={120}
            value={noteForVendor}
            onChange={(e) => setNoteForVendor(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">{noteForVendor.length} / 120</p>
        </div>

        {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
      </section>

      {/* Sticky checkout CTA — sits above the consumer bottom nav (z-40) so it's
          always reachable while the form is long. Includes total recap so the
          user knows what they're paying before tapping. */}
      <div
        className="fixed inset-x-0 bottom-16 z-30 border-t border-divider bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              {t('stickyArticle', { count: cart.lines.length })} ·{' '}
              {paymentMethod === 'MTN_MOMO' ? 'MTN' : 'Orange'}
              {scheduledFor && acceptsPreOrders
                ? ` · ${t('preOrderEcho', { time: formatLocalHHMM(scheduledFor) })}`
                : ''}
            </p>
            <p className="text-base font-extrabold">{formatXAF(cart.subtotalXAF)}</p>
          </div>
          <Button
            type="button"
            size="lg"
            disabled={!canSubmit}
            onClick={onSubmit}
            className="max-w-[60%] flex-1"
          >
            {submitting
              ? t('submitSending')
              : scheduledFor && acceptsPreOrders
                ? t('submitCtaPreOrder')
                : t('submitCta')}
          </Button>
        </div>
      </div>
    </main>
  );
}

function AddressPicker({
  state,
  selectedAddressId,
  onSelect,
}: {
  state: ReturnType<typeof useAddresses>;
  selectedAddressId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations('Cart');
  if (state.status === 'loading') {
    return <Skeleton className="h-20 rounded-lg" />;
  }
  if (state.status === 'error') {
    return (
      <p className="text-sm text-destructive">{t('addressesError', { message: state.message })}</p>
    );
  }
  if (state.status === 'unauthenticated') return null; // handled at the page level

  if (state.addresses.length === 0) {
    return (
      <div className="rounded-lg border bg-background p-3 text-sm">
        <p className="font-semibold">{t('noAddresses')}</p>
        <p className="mt-1 text-muted-foreground">{t('noAddressesBody')}</p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link href="/account/addresses">{t('addAddress')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{t('deliveryAddress')}</h2>
      <ul className="space-y-2">
        {state.addresses.map((addr) => (
          <li key={addr.id}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                selectedAddressId === addr.id ? 'border-chop-red bg-background' : 'bg-background'
              }`}
            >
              <input
                type="radio"
                name="address"
                value={addr.id}
                checked={selectedAddressId === addr.id}
                onChange={() => onSelect(addr.id)}
                className="mt-1"
              />
              <AddressDisplay addr={addr} />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AddressDisplay({ addr }: { addr: SavedAddress }) {
  const t = useTranslations('Cart');
  return (
    <span className="min-w-0">
      <p className="font-semibold">
        {addr.label ?? t('addressLabel')}
        {addr.isDefault ? (
          <span className="ml-2 text-xs text-muted-foreground">{t('defaultBadge')}</span>
        ) : null}
      </p>
      {addr.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{addr.description}</p>
      ) : null}
      {addr.quartier ? <p className="text-xs text-muted-foreground">📍 {addr.quartier}</p> : null}
    </span>
  );
}

/**
 * Promo coupon entry block (#167).
 *
 * Collapsed by default — a single "J'ai un code promo" toggle reveals
 * the input. Once a code is validated, the section flips to a green
 * applied-state chip with an X to remove. The backend is the source
 * of truth: every redemption is validated atomically inside the
 * order-creation transaction.
 *
 * UX choices:
 *   - The applied state shows TEXT instead of a XAF discount because
 *     the delivery fee is server-computed (the cart doesn't know it
 *     until the order POSTs). "Livraison gratuite" reads cleaner than
 *     "-0 FCFA" anyway.
 *   - Apply button is disabled while the input is empty or while a
 *     request is in flight, so a double-tap can't double-fire the
 *     validate call.
 */
function CouponPanel({
  input,
  onInputChange,
  applied,
  validating,
  error,
  onApply,
  onClear,
}: {
  input: string;
  onInputChange: (v: string) => void;
  applied: ValidatedCoupon | null;
  validating: boolean;
  error: string | null;
  onApply: () => void;
  onClear: () => void;
}) {
  const t = useTranslations('Cart');
  const [expanded, setExpanded] = React.useState(false);

  if (applied) {
    return (
      <div
        className="border-mboue/40 bg-mboue-light/40 flex items-center gap-3 rounded-lg border p-3 text-sm"
        role="status"
        aria-live="polite"
      >
        <span aria-hidden className="text-lg">
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-chop-ink">
            {t.rich('couponApplied', {
              code: applied.code,
            })}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {applied.type === 'FREE_DELIVERY' ? t('couponFreeDelivery') : applied.description}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={t('couponRemove')}
        >
          {t('couponRemove')}
        </Button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2.5 text-left text-sm font-semibold text-chop-ink transition-colors hover:bg-chop-warm"
      >
        <span>{t('couponToggleOpen')}</span>
        <span aria-hidden className="text-muted-foreground">
          +
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <label htmlFor="couponCode" className="mb-1 block text-sm font-semibold">
        {t('couponLabel')}
      </label>
      <div className="flex gap-2">
        <Input
          id="couponCode"
          name="couponCode"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          placeholder={t('couponPlaceholder')}
          value={input}
          maxLength={32}
          onChange={(e) => onInputChange(e.target.value.toUpperCase().replace(/\s+/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onApply();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={onApply}
          disabled={validating || input.trim().length === 0}
        >
          {validating ? '…' : t('couponApply')}
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {t.rich('couponHelp', {
            code: (chunks) => <span className="font-mono">{chunks}</span>,
          })}
        </p>
      )}
    </div>
  );
}

function AuthRequiredPanel() {
  const t = useTranslations('AuthRequired');
  // Mark logout-state so the next view of /login redirects back to /cart on success.
  React.useEffect(() => {
    auth.clear();
  }, []);
  return (
    <AuthRequired
      theme="light"
      subtitle={t('subtitleCart')}
      loginHref="/login?next=/cart"
      features={[
        { icon: '🛒', label: t('featureCart') },
        { icon: '💳', label: t('featurePayment') },
        { icon: '📍', label: t('featureDelivery') },
        { icon: '🔔', label: t('featureNotifications') },
      ]}
      reassurance={t('reassurance')}
    />
  );
}
