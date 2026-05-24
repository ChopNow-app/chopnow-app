/**
 * Funnel-event wrapper around Vercel Analytics (`@vercel/analytics`).
 *
 * Vercel Analytics auto-captures pageviews; this module adds the
 * pilot-critical custom events that the founder needs to see on
 * Monday morning when checking "did people drop off, where, why".
 *
 * # Why a wrapper, not direct `track()` calls
 *
 *   1. **Typed event names** — TypeScript catches typos. A misspelled
 *      `cart_item_addeed` would silently create a useless bucket in
 *      the Vercel dashboard.
 *   2. **PII contract** — `properties` is constrained to a small set
 *      of allowed keys (vendorId, paymentMethod, etc.). Phone, full
 *      delivery addresses, order codes, MoMo numbers NEVER enter
 *      the event payload. Centralizing the rule here means review
 *      catches violations at one call site.
 *   3. **Inert by default** — Vercel Analytics is inert on
 *      localhost. We add an extra try/catch so a future bug in the
 *      SDK doesn't crash the calling component (analytics is
 *      observability, not business logic).
 *
 * # The 7 pilot funnel events
 *
 *   auth:        otp_requested    → otp_verified
 *   discovery:   vendor_viewed
 *   cart:        cart_item_added  → checkout_started
 *   convert:     order_placed | order_failed
 *
 * Together they answer:
 *   - "How many phones requested an OTP this week?" (auth signal)
 *   - "What % of OTP requests verified?" (delivery health)
 *   - "Of users who viewed a vendor, what % added to cart?" (discovery)
 *   - "Of users who started checkout, what % completed?" (UX friction)
 *   - "When orders fail, which payment provider?" (MoMo vs Orange split)
 *
 * For the funnel UI, Vercel Analytics' Custom Events tab shows the
 * counts; cross-filter via UTM if you want a campaign breakdown.
 */

import { track as vercelTrack } from '@vercel/analytics';

/** Allowed event names — typed so misspellings fail at compile time. */
export type FunnelEvent =
  | 'otp_requested'
  | 'otp_verified'
  | 'vendor_viewed'
  | 'cart_item_added'
  | 'checkout_started'
  | 'order_placed'
  | 'order_failed';

/**
 * Allowed event properties. Vercel's contract: keys ≤ 64 chars,
 * values must be string | number | boolean. Each entry is documented
 * with a one-line "what it answers".
 */
interface EventProps {
  // What payment method the user picked. Tells us MTN vs Orange
  // split + how often each fails.
  paymentMethod?: 'MTN_MOMO' | 'ORANGE_MONEY';
  // Public vendor id (already client-visible, not PII).
  vendorId?: string;
  // Currency-major amount (FCFA). Bucket counts > exact-amount math —
  // Vercel rounds aggressively in the dashboard. Use this for "average
  // basket size" trends, not finance.
  amountXAF?: number;
  // Item count in the cart at the moment of the event. Drives
  // "how many items did the median checkout have?" — guides future
  // bundle / suggestion features.
  itemCount?: number;
  // For order_failed: the structured error code from the backend
  // (e.g. 'pre_orders_not_accepted_by_this_vendor'). NOT the raw
  // error message (could contain PII fragments).
  errorCode?: string;
}

/**
 * Fire a custom funnel event. Failures are swallowed — analytics is
 * not business-critical, and a Vercel SDK regression should not
 * cascade into the calling component.
 *
 * @example
 *   track('order_placed', { paymentMethod: 'MTN_MOMO', amountXAF: 4500 })
 */
export function track(event: FunnelEvent, properties?: EventProps): void {
  try {
    vercelTrack(event, properties as Record<string, string | number | boolean>);
  } catch {
    /* swallow — analytics must never break the calling path */
  }
}
