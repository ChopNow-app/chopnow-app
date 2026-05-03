/**
 * Single source of truth for supported locales.
 * MVP: French only (Cameroon market). English ships post-launch.
 */
export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
