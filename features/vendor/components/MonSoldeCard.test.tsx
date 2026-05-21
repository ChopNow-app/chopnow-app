import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MonSoldeCard } from './MonSoldeCard';
import { apiRaw } from '@/lib/api/api-client';

vi.mock('@/lib/api/api-client', () => ({
  apiRaw: { get: vi.fn() },
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public readonly status: number,
      public readonly body: unknown,
    ) {
      super(`API ${status}`);
    }
  },
}));

const mockGet = vi.mocked(apiRaw.get);

// `toLocaleString('fr-FR')` separates thousands with a NBSP (U+00A0), not a
// regular space — match across both via a whitespace-normalizing matcher.
function ws(s: string) {
  return (content: string) => content.replace(/\s+/g, ' ').includes(s);
}

const baseBalance = {
  balanceXAF: 12500,
  isTrusted: false,
  vendorType: 'RESTAURANT' as const,
  lastPayoutAt: null,
  lastPayoutXAF: null,
  nextScheduledPayout: {
    cadence: 'WEEKLY_SUNDAY' as const,
    estimatedAt: '2026-05-24T01:00:00.000Z', // Sunday 02:00 Douala
  },
  recentPayouts: [],
  pendingCashoutRequestId: null,
};

describe('MonSoldeCard', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('renders balance + next scheduled payout for a RESTAURANT vendor', async () => {
    mockGet.mockResolvedValueOnce(baseBalance);

    render(<MonSoldeCard />);

    await waitFor(() => {
      expect(screen.getByText(ws('12 500 FCFA'))).toBeInTheDocument();
    });
    expect(screen.getByText(/Prochain virement/i)).toBeInTheDocument();
    // The Sunday 02:00 Douala estimate should render with a French time label.
    expect(screen.getByText(/02h00/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vérifié/i)).not.toBeInTheDocument();
  });

  it('shows the "Vérifié" chip for trusted INFORMAL vendors only', async () => {
    mockGet.mockResolvedValueOnce({
      ...baseBalance,
      vendorType: 'INFORMAL',
      isTrusted: true,
      nextScheduledPayout: { cadence: 'ON_DEMAND', estimatedAt: null },
    });

    render(<MonSoldeCard />);
    await waitFor(() => {
      expect(screen.getByText(/Vérifié/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Sur demande')).toBeInTheDocument();
  });

  it('does not show the chip for INFORMAL vendors who are not yet trusted', async () => {
    mockGet.mockResolvedValueOnce({
      ...baseBalance,
      vendorType: 'INFORMAL',
      isTrusted: false,
      nextScheduledPayout: { cadence: 'ON_DEMAND', estimatedAt: null },
    });

    render(<MonSoldeCard />);
    await waitFor(() => {
      expect(screen.getByText('Sur demande')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Vérifié/i)).not.toBeInTheDocument();
  });

  it('renders last payout amount + relative date when present', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600_000).toISOString();
    mockGet.mockResolvedValueOnce({
      ...baseBalance,
      lastPayoutAt: fourDaysAgo,
      lastPayoutXAF: 8500,
    });

    render(<MonSoldeCard />);
    await waitFor(() => {
      expect(screen.getByText(ws('8 500 FCFA'))).toBeInTheDocument();
    });
    expect(screen.getByText(/il y a 4 jours/i)).toBeInTheDocument();
  });

  it('toggles the recent-payouts history list on click', async () => {
    mockGet.mockResolvedValueOnce({
      ...baseBalance,
      recentPayouts: [
        {
          id: 'p-1',
          periodStart: '2026-05-05T00:00:00.000Z',
          periodEnd: '2026-05-11T23:59:59.000Z',
          netXAF: 4500,
          status: 'PAID' as const,
          paidAt: '2026-05-12T01:00:00.000Z',
        },
      ],
    });

    render(<MonSoldeCard />);
    await waitFor(() => {
      expect(screen.getByText(/Historique \(1\)/i)).toBeInTheDocument();
    });
    // Collapsed by default — payout row not visible
    expect(screen.queryByText(ws('4 500 FCFA'))).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/Historique/i));
    expect(screen.getByText(ws('4 500 FCFA'))).toBeInTheDocument();
    expect(screen.getByText(/payé/i)).toBeInTheDocument();
  });

  it('shows an error + retry button when the fetch fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'));

    render(<MonSoldeCard />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Réessayer/i })).toBeInTheDocument();
    });
  });
});
