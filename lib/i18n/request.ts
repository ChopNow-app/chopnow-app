import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, locales, type Locale } from './config';

/**
 * Locale resolution order (per request):
 *   1. `chopnow.locale` cookie — set by the LanguageSwitcher when the
 *      user picks FR or EN explicitly. Highest priority because it
 *      reflects an active choice.
 *   2. `Accept-Language` header — automatic preference inferred from
 *      the browser. Picked only when no cookie is set; we match the
 *      first supported language with a primary tag we know.
 *   3. `defaultLocale` (fr) — pilot market is Francophone Douala, so
 *      that's the natural fallback for unknown clients.
 *
 * The cookie is set client-side by the LanguageSwitcher via a server
 * action. Cookie name is namespaced under `chopnow.` so it doesn't
 * collide with other apps on the same root domain.
 */
export const LOCALE_COOKIE = 'chopnow.locale';

function pickLocaleFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  // Accept-Language: "fr-CH,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  // We split on ',' and read the primary tag from each entry (before
  // any q-value / region tag) in order of appearance — close enough to
  // the spec for our 2-locale case without pulling in a parser dep.
  const tags = header
    .split(',')
    .map((t) => t.split(';')[0].trim().toLowerCase().split('-')[0])
    .filter(Boolean);
  for (const tag of tags) {
    if ((locales as readonly string[]).includes(tag)) return tag as Locale;
  }
  return null;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerList = await headers();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const cookieLocale =
    fromCookie && (locales as readonly string[]).includes(fromCookie)
      ? (fromCookie as Locale)
      : null;
  const headerLocale = cookieLocale
    ? null
    : pickLocaleFromAcceptLanguage(headerList.get('accept-language'));
  const locale: Locale = cookieLocale ?? headerLocale ?? defaultLocale;
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
