import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, type Locale } from './config';

/**
 * MVP setup: serve French to everyone. When we add English (post-launch),
 * read the locale from a cookie or `accept-language` header here.
 */
export default getRequestConfig(async () => {
  const locale: Locale = defaultLocale;
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
