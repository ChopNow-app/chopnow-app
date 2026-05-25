'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { locales, type Locale } from './config';
import { LOCALE_COOKIE } from './request';

/**
 * Server action invoked by the LanguageSwitcher to persist the user's
 * locale choice. We use a cookie (not localStorage) so the next-intl
 * server-side request config sees the choice on the very next request
 * — server components rendered during navigation get the right
 * messages immediately, no hydration mismatch.
 *
 * The cookie:
 *   - Lives 1 year (food delivery users do not change languages often)
 *   - Path = / so every route sees it
 *   - SameSite=Lax so it survives normal navigation but blocks
 *     cross-site requests (we don't accept third-party language flips)
 *   - Not HttpOnly: the LanguageSwitcher reads the current value
 *     client-side to mark the active option in the dropdown without
 *     a server roundtrip
 *
 * After setting the cookie we revalidate the path so the calling page
 * re-renders with the new messages.
 */
export async function setLocaleAction(locale: Locale, pathname: string): Promise<void> {
  // Whitelist guard — the server-side request handler also validates,
  // but a tampered request here would still hit the cookie. Reject
  // unknown locales rather than blindly trusting the input.
  if (!(locales as readonly string[]).includes(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    // Production runs on HTTPS only; the Secure flag prevents the
    // cookie leaking over plaintext if somehow the user reaches us
    // via http://. Stripped in dev (localhost is http).
    secure: process.env.NODE_ENV === 'production',
  });
  // Re-render the page that called us so the new messages take effect.
  // We pass the pathname explicitly because revalidatePath can't infer
  // it from a server action's call site.
  revalidatePath(pathname);
}
