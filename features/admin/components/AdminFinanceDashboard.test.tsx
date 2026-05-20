import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFinanceDashboard } from './AdminFinanceDashboard';

vi.mock('../api', () => ({
  adminFinanceApi: {
    listCashoutRequests: vi.fn(),
    listVendorBalances: vi.fn(),
    listRiderBalances: vi.fn(),
    listRefundQueue: vi.fn(),
    approveCashoutRequest: vi.fn(),
    rejectCashoutRequest: vi.fn(),
  },
}));

const api = await import('../api');

describe('AdminFinanceDashboard', () => {
  beforeEach(() => {
    vi.mocked(api.adminFinanceApi.listCashoutRequests).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listVendorBalances).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listRiderBalances).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listRefundQueue).mockResolvedValue({ total: 0, rows: [] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders four tabs and defaults to cashout requests', async () => {
    render(<AdminFinanceDashboard />);
    expect(screen.getByText('Demandes de virement')).toBeInTheDocument();
    expect(screen.getByText('Soldes vendeurs')).toBeInTheDocument();
    expect(screen.getByText('Soldes livreurs')).toBeInTheDocument();
    expect(screen.getByText('Remboursements en attente')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.adminFinanceApi.listCashoutRequests).toHaveBeenCalledWith({
        status: 'PENDING_APPROVAL',
      });
    });
  });

  it('renders pending cashout rows with vendor name + amount + trusted badge', async () => {
    vi.mocked(api.adminFinanceApi.listCashoutRequests).mockResolvedValue({
      total: 1,
      rows: [
        {
          requestId: 'req-1',
          vendorId: 'v-1',
          vendorName: 'Tantine Belle',
          vendorType: 'INFORMAL',
          requestedXAF: 3500,
          status: 'PENDING_APPROVAL',
          createdAt: new Date().toISOString(),
          ageHours: 2,
          isTrusted: true,
        },
      ],
    });
    render(<AdminFinanceDashboard />);
    await waitFor(() => expect(screen.getByText('Tantine Belle')).toBeInTheDocument());
    expect(screen.getByText(/3\s*500\s*FCFA/)).toBeInTheDocument();
    expect(screen.getByText('Trusted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approuver' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeter' })).toBeInTheDocument();
  });

  it('hides Approve/Reject buttons on resolved requests', async () => {
    vi.mocked(api.adminFinanceApi.listCashoutRequests).mockResolvedValue({
      total: 1,
      rows: [
        {
          requestId: 'req-1',
          vendorId: 'v-1',
          vendorName: 'Resto',
          vendorType: 'RESTAURANT',
          requestedXAF: 5000,
          status: 'APPROVED',
          createdAt: new Date().toISOString(),
          ageHours: 12,
          isTrusted: false,
        },
      ],
    });
    render(<AdminFinanceDashboard />);
    await waitFor(() => expect(screen.getByText('Resto')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeter' })).not.toBeInTheDocument();
  });
});
