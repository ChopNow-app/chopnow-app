/**
 * Session-scoped page-view counter.
 *
 * Used to gate contextual prompts (push notifications, install hints)
 * so they don't fire on a user's first interaction with the app — first
 * impressions get the food, not a modal.
 *
 * Counts unique route mounts within a single browser session
 * (sessionStorage clears on tab close), not full reloads.
 */
const KEY = 'chopnow.pvCount';

export function recordPageView(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const current = Number(window.sessionStorage.getItem(KEY) ?? '0') || 0;
    const next = current + 1;
    window.sessionStorage.setItem(KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function getPageViewCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number(window.sessionStorage.getItem(KEY) ?? '0') || 0;
  } catch {
    return 0;
  }
}
