// Shared types mirroring the backend's BrowseService.VendorCard. The OpenAPI
// generator on the NestJS side doesn't emit detailed response schemas yet
// (Story 6.x will add @ApiResponse decorators across the controllers), so we
// declare the shape here. Kept narrow to what /restaurants and /vendors/:id
// actually need.

export type VendorType = 'INFORMAL' | 'SEMI_FORMAL' | 'RESTAURANT';
export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type WeeklyHours = Partial<Record<DayKey, { open: string; close: string }>>;

export interface VendorCard {
  id: string;
  name: string;
  type: VendorType;
  badge: string | null;
  quartier: string;
  profilePhotoUrl: string | null;
  description: string | null;
  distanceKm: number;
  deliveryFeeXAF: number;
  etaMinutes: number;
  /** 1 = ≤2km · 2 = ≤5km · 3 = >5km */
  plan: 1 | 2 | 3;
  isOpenNow: boolean;
}

export interface CatalogueResponse {
  vendors: VendorCard[];
}

export interface PublicVendorView {
  vendor: Omit<VendorCard, 'distanceKm' | 'deliveryFeeXAF' | 'etaMinutes' | 'plan'> & {
    hours: WeeklyHours | null;
  };
  categories: Array<{ id: string; name: string; sortOrder: number }>;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    priceXAF: number;
    photoUrl: string | null;
    categoryId: string | null;
    isInStock: boolean;
    sortOrder: number;
    preparationMinutes: number | null;
  }>;
}
