import { screen } from '@testing-library/react';
import { renderWithIntlSync as render } from '@/tests/render-with-intl';
import { describe, expect, it } from 'vitest';

import { VendorCard } from './VendorCard';
import type { VendorCard as VendorCardType } from '../types';

const baseVendor: VendorCardType = {
  id: 'v-1',
  name: 'Chez Maman Mboué',
  type: 'INFORMAL',
  badge: 'Cuisine locale 🍲',
  quartier: 'Makepe',
  profilePhotoUrl: null,
  description: null,
  distanceKm: 1.2,
  deliveryFeeXAF: 400,
  etaMinutes: 22,
  plan: 1,
  isOpenNow: true,
};

describe('VendorCard', () => {
  it('renders name, badge, distance, fee, and ETA from the server payload', () => {
    render(<VendorCard vendor={baseVendor} />);
    expect(screen.getByText('Chez Maman Mboué')).toBeInTheDocument();
    expect(screen.getByText('Cuisine locale 🍲')).toBeInTheDocument();
    expect(screen.getByText(/1\.2 km/)).toBeInTheDocument();
    expect(screen.getByText(/~22 min/)).toBeInTheDocument();
    expect(screen.getByText(/400 FCFA/)).toBeInTheDocument();
  });

  it('links to the vendor detail page', () => {
    render(<VendorCard vendor={baseVendor} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/vendors/v-1');
  });

  it('shows the Fermé badge and dims the card when isOpenNow=false', () => {
    render(<VendorCard vendor={{ ...baseVendor, isOpenNow: false }} />);
    expect(screen.getByText('Fermé')).toBeInTheDocument();
    expect(screen.getByRole('link').className).toContain('opacity-65');
  });

  it('renders a deterministic cuisine emoji fallback when no profile photo is set', () => {
    // baseVendor's badge "Cuisine locale 🍲" matches the `local` keyword,
    // so the placeholder picks the 🥘 (local cuisine) emoji.
    render(<VendorCard vendor={{ ...baseVendor, profilePhotoUrl: null }} />);
    expect(screen.getAllByText('🥘').length).toBeGreaterThan(0);
  });

  it('falls back to the generic 🍲 emoji when name + badge match no cuisine keyword', () => {
    render(
      <VendorCard
        vendor={{ ...baseVendor, name: 'Vendeur Test', badge: null, profilePhotoUrl: null }}
      />,
    );
    expect(screen.getAllByText('🍲').length).toBeGreaterThan(0);
  });
});
