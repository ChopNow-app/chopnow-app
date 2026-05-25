import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntlSync as render } from '@/tests/render-with-intl';
import { AdminFinanceDashboard } from './AdminFinanceDashboard';

vi.mock('../api', () => ({
  adminFinanceApi: {
    listCashoutRequests: vi.fn(),
    listVendorBalances: vi.fn(),
    listRiderBalances: vi.fn(),
    listRefundQueue: vi.fn(),
    listEscalations: vi.fn(),
    approveCashoutRequest: vi.fn(),
    rejectCashoutRequest: vi.fn(),
    retryVendorPayout: vi.fn(),
    retryRiderPayout: vi.fn(),
    manualMarkVendorPayoutPaid: vi.fn(),
    manualMarkRiderPayoutPaid: vi.fn(),
  },
}));

const api = await import('../api');

describe('AdminFinanceDashboard', () => {
  beforeEach(() => {
    vi.mocked(api.adminFinanceApi.listCashoutRequests).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listVendorBalances).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listRiderBalances).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listRefundQueue).mockResolvedValue({ total: 0, rows: [] });
    vi.mocked(api.adminFinanceApi.listEscalations).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all five tabs and defaults to escalations', async () => {
    render(<AdminFinanceDashboard />);
    expect(screen.getByText('Escalations')).toBeInTheDocument();
    expect(screen.getByText('Demandes de virement')).toBeInTheDocument();
    expect(screen.getByText('Soldes vendeurs')).toBeInTheDocument();
    expect(screen.getByText('Soldes livreurs')).toBeInTheDocument();
    expect(screen.getByText('Remboursements en attente')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.adminFinanceApi.listEscalations).toHaveBeenCalled();
    });
  });

  it('renders escalation rows with retry + mark-paid buttons for FAILED vendor payouts', async () => {
    vi.mocked(api.adminFinanceApi.listEscalations).mockResolvedValue([
      {
        kind: 'vendor_payout',
        id: 'vp-1',
        contextId: 'v-1',
        status: 'FAILED',
        netXAF: 4230,
        momoPhone: '+237670000001',
        failureReason: 'insufficient_balance',
        scheduledFor: new Date().toISOString(),
        sentAt: null,
        ageMinutes: 45,
      },
    ]);
    render(<AdminFinanceDashboard />);
    await waitFor(() => expect(screen.getByText(/4\s*230\s*FCFA/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marquer payé' })).toBeInTheDocument();
    expect(screen.getByText('insufficient_balance', { exact: false })).toBeInTheDocument();
  });

  it('shows empty state when nothing needs escalation', async () => {
    render(<AdminFinanceDashboard />);
    await waitFor(() => expect(screen.getByText(/Aucune escalation/)).toBeInTheDocument());
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
    // Default tab is Escalations now — click into the cashout tab first.
    fireEvent.click(screen.getByText('Demandes de virement'));
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
    fireEvent.click(screen.getByText('Demandes de virement'));
    await waitFor(() => expect(screen.getByText('Resto')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Approuver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rejeter' })).not.toBeInTheDocument();
  });
});
