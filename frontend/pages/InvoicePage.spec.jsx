import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadTripInvoicePdf,
  emailTripInvoice,
  getTripInvoice,
  issueTripInvoice,
} from '../api/invoices.js';
import InvoicePage from './InvoicePage.jsx';

vi.mock('../api/invoices.js', () => ({
  downloadTripInvoicePdf: vi.fn(),
  emailTripInvoice: vi.fn(),
  getTripInvoice: vi.fn(),
  issueTripInvoice: vi.fn(),
}));

vi.mock('../components/InvoiceTemplate.jsx', () => ({
  default: ({ invoice }) => (
    <div>
      <span>{invoice.invoiceNumber}</span>
      <span>{invoice.trip?.pickupAddress}</span>
    </div>
  ),
}));

describe('InvoicePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('jpTaxiLanguage', 'en');
    localStorage.setItem(
      'jpTaxiSession',
      JSON.stringify({ token: 'token', role: 'customer', user: { id: 1 } }),
    );
  });

  it('shows an empty state when no completed trip is selected', () => {
    render(
      <MemoryRouter initialEntries={['/invoice']}>
        <InvoicePage />
      </MemoryRouter>,
    );

    expect(screen.getByText((_, element) => element?.classList.contains('empty-state') ?? false)).toBeInTheDocument();
    expect(getTripInvoice).not.toHaveBeenCalled();
  });

  it('shows the invoice API error without rendering fallback data', async () => {
    getTripInvoice.mockRejectedValue(new Error('Invoice not found.'));

    render(
      <MemoryRouter initialEntries={['/invoice?tripId=44']}>
        <InvoicePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText((_, element) => element?.classList.contains('empty-state') ?? false)).toBeInTheDocument();
    expect(screen.queryByText(/JPT-/)).not.toBeInTheDocument();
  });

  it('issues, downloads and emails the real invoice', async () => {
    const user = userEvent.setup();
    const invoice = {
      tripId: 45,
      invoiceNumber: 'JPT-2026-000045',
      recipientEmail: 'customer@jptaxi.local',
      buyer: { email: 'customer@jptaxi.local' },
      trip: { pickupAddress: 'Real pickup' },
    };
    getTripInvoice.mockResolvedValue({ canIssue: true, tripId: 45 });
    issueTripInvoice.mockResolvedValue({ invoice });
    downloadTripInvoicePdf.mockResolvedValue(
      new Blob(['%PDF-test'], { type: 'application/pdf' }),
    );
    emailTripInvoice.mockResolvedValue({ message: 'Invoice email sent.' });
    const createObjectUrl = vi.fn(() => 'blob:invoice');
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const { container } = render(
      <MemoryRouter initialEntries={['/invoice?tripId=45']}>
        <InvoicePage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('JPT-2026-000045')).toBeInTheDocument();
    expect(screen.getByText('Real pickup')).toBeInTheDocument();
    expect(issueTripInvoice).toHaveBeenCalledWith(45);

    await user.click(container.querySelectorAll('.invoice-actions button')[0]);
    expect(downloadTripInvoicePdf).toHaveBeenCalledWith(45);
    expect(createObjectUrl).toHaveBeenCalled();
    expect(anchorClick).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:invoice');

    await user.click(container.querySelectorAll('.invoice-actions button')[1]);

    expect(emailTripInvoice).toHaveBeenCalledWith(45, {
      recipientEmail: 'customer@jptaxi.local',
    });
    expect(await screen.findByText((_, element) => element?.classList.contains('payment-status-text') ?? false)).toBeInTheDocument();
  });
});
