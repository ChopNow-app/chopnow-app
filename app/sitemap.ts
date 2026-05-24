import type { MetadataRoute } from 'next';

// Sitemap — emitted at /sitemap.xml. Next.js Metadata Files convention.
//
// Two parts:
//   1. Static routes — home, restaurant catalog, marketing landings.
//   2. Dynamic vendor detail pages — fetched from the public catalogue
//      endpoint at build/revalidate time. Each becomes /vendors/{id}.
//
// Crawlers re-read /sitemap.xml on their own cadence (~daily for an
// active site). The page itself revalidates every 6 hours so a freshly
// approved vendor shows up in Google within ~6h + Google's recrawl
// window — fast enough for a pilot.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.tchopnow.app';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api-staging.tchopnow.app';

// Re-derive the sitemap every 6 hours. Hot-cache means crawler hits cost
// nothing; cold rebuild is one /catalogue call + map.
export const revalidate = 21_600;

interface CatalogueVendor {
  id: string;
}

interface CatalogueResponse {
  vendors: CatalogueVendor[];
}

async function fetchVendorIds(): Promise<string[]> {
  // Hit the catalogue with the Douala fallback coords; the radius is
  // generous enough to cover any pilot zone we plausibly add. If the
  // fetch fails (API down, network), we silently fall back to an empty
  // list — the static routes still ship, sitemap is just less rich.
  try {
    const url = new URL('/api/v1/catalogue', API_URL);
    url.searchParams.set('lat', '4.0511');
    url.searchParams.set('lng', '9.7679');
    url.searchParams.set('radiusKm', '25');
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return [];
    const json = (await res.json()) as CatalogueResponse;
    return json.vendors?.map((v) => v.id) ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/restaurants`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/launch`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/vendre`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/livrer`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/statut`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const vendorIds = await fetchVendorIds();
  const vendorRoutes: MetadataRoute.Sitemap = vendorIds.map((id) => ({
    url: `${SITE_URL}/vendors/${id}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...vendorRoutes];
}
