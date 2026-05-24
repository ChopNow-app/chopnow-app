import type { Metadata } from 'next';
import { VendorDetailPage } from '@/features/consumer/components/VendorDetailPage';

// Public catalogue endpoint — same shape used on the client, fetched
// server-side here so generateMetadata can emit per-vendor title +
// description + JSON-LD. Next dedupes this fetch with the React Server
// Component pass that fires below (App Router request memoization), so
// the runtime cost is one HTTP call per page render.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api-staging.tchopnow.app';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.tchopnow.app';

interface PublicVendor {
  id: string;
  name: string;
  badge: string | null;
  quartier: string;
  description: string | null;
  profilePhotoUrl: string | null;
  hours: Record<string, { open: string; close: string }> | null;
}

interface PublicVendorPayload {
  vendor: PublicVendor;
}

async function fetchVendor(vendorId: string): Promise<PublicVendor | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/vendors/${vendorId}`, {
      // Per-page cache — vendor metadata changes rarely, but a name /
      // description edit should propagate to crawlers within an hour.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as PublicVendorPayload;
    return json.vendor;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorId: string }>;
}): Promise<Metadata> {
  const { vendorId } = await params;
  const vendor = await fetchVendor(vendorId);

  if (!vendor) {
    return {
      title: 'Restaurant introuvable',
      robots: { index: false },
    };
  }

  const title = `${vendor.name} — ${vendor.quartier}, Douala`;
  const description = vendor.description
    ? // Keep descriptions under Google's ~160-char cutoff. Backend
      // doesn't enforce a max so trim defensively.
      vendor.description.slice(0, 155) + (vendor.description.length > 155 ? '…' : '')
    : `Commande chez ${vendor.name} à ${vendor.quartier}, Douala. Livraison via TChopNow, paie via MoMo.`;

  const photoUrl = vendor.profilePhotoUrl ? `${SITE_URL}/r2/${vendor.profilePhotoUrl}` : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/vendors/${vendorId}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/vendors/${vendorId}`,
      images: photoUrl ? [{ url: photoUrl, alt: vendor.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: photoUrl ? [photoUrl] : undefined,
    },
  };
}

// Story 2.6 — public vendor profile + menu. Public route.
export default async function VendorPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await fetchVendor(vendorId);

  // JSON-LD — Schema.org Restaurant / FoodEstablishment. Gives Google
  // enough hooks to surface this page in "restaurants near me" + Maps
  // results in Douala. address.addressLocality maps to the quartier;
  // the city stays Douala (pilot zone). Only emitted when we have data
  // (fetch may have failed silently).
  const jsonLd = vendor
    ? {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        '@id': `${SITE_URL}/vendors/${vendor.id}`,
        name: vendor.name,
        description: vendor.description ?? undefined,
        image: vendor.profilePhotoUrl ? `${SITE_URL}/r2/${vendor.profilePhotoUrl}` : undefined,
        address: {
          '@type': 'PostalAddress',
          addressLocality: vendor.quartier,
          addressRegion: 'Littoral',
          addressCountry: 'CM',
        },
        servesCuisine: vendor.badge ?? undefined,
        url: `${SITE_URL}/vendors/${vendor.id}`,
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          // JSON.stringify is XSS-safe here — we control every field, and
          // any `<` inside the data is escaped by the JSON encoder. The
          // dangerouslySetInnerHTML is required because JSON-LD must live
          // inside a <script> tag for crawlers to pick it up.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <VendorDetailPage vendorId={vendorId} />
    </>
  );
}
