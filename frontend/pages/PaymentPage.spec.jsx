import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPaymentMethods } from '../api/customers.js';
import { getActiveRide, processRidePayment } from '../api/rides.js';
import PaymentPage from './PaymentPage.jsx';

vi.mock('../api/customers.js', () => ({
  getPaymentMethods: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  getActiveRide: vi.fn(),
  processRidePayment: vi.fn(),
}));

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('jpTaxiLanguage', 'en');
    sessionStorage.clear();
  });

  it('does not show the payment form before the driver requests payment', async () => {
    getActiveRide.mockResolvedValue({
      type: 'trip',
      paymentRequested: false,
      data: {
        tripId: 12,
        startTime: '2026-06-11T10:00:00.000Z',
        actualDistanceKm: '8.2',
        rawFareVnd: 90_000,
        finalFareVnd: 100_000,
        rideRequest: {
          pickupAddress: 'Pickup',
          dropoffAddress: 'Drop-off',
        },
      },
    });
    getPaymentMethods.mockResolvedValue([
      {
        paymentMethodId: 3,
        brand: 'VISA',
        lastFour: '4821',
        isDefault: true,
      },
    ]);

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText((_, element) => element?.classList.contains('empty-state') ?? false)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /pay now/i }),
    ).not.toBeInTheDocument();
    expect(processRidePayment).not.toHaveBeenCalled();
  });

  it('shows an empty state when there is no active trip', async () => {
    getActiveRide.mockResolvedValue(null);
    getPaymentMethods.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText((_, element) => element?.classList.contains('empty-state') ?? false)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /pay now/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the API error instead of demo trip data', async () => {
    getActiveRide.mockRejectedValue(new Error('Payment API is offline.'));
    getPaymentMethods.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText((_, element) => element?.classList.contains('empty-state') ?? false)).toBeInTheDocument();
    expect(screen.queryByText('Pickup')).not.toBeInTheDocument();
  });

  it('submits the entered password and stored payment method', async () => {
    const user = userEvent.setup();
    getActiveRide.mockResolvedValue({
      type: 'trip',
      paymentRequested: true,
      data: {
        tripId: 21,
        startTime: '2026-06-11T10:00:00.000Z',
        actualDistanceKm: '8.2',
        rawFareVnd: 90_000,
        finalFareVnd: 100_000,
        rideRequest: {
          pickupAddress: 'Real pickup',
          dropoffAddress: 'Real drop-off',
        },
      },
    });
    getPaymentMethods.mockResolvedValue([
      {
        paymentMethodId: 7,
        brand: 'MASTER',
        lastFour: '4444',
        isDefault: true,
      },
    ]);
    processRidePayment.mockResolvedValue({
      tripId: 21,
      status: 'completed',
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/payment']}>
        <Routes>
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/invoice" element={<div>Invoice destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Real pickup')).toBeInTheDocument();
    await user.type(document.querySelector('input[type="password"]'), 'entered-by-customer');
    await user.click(document.querySelector('.pay-confirm'));

    expect(processRidePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: 21,
        paymentMethod: 'MASTER',
        paymentMethodId: 7,
        password: 'entered-by-customer',
      }),
    );
    expect(await screen.findByText('Invoice destination')).toBeInTheDocument();
  });

  it('selects cash from the payment modal without a stored card id', async () => {
    const user = userEvent.setup();
    getActiveRide.mockResolvedValue({
      type: 'trip',
      paymentRequested: true,
      data: {
        tripId: 22,
        startTime: '2026-06-11T10:00:00.000Z',
        actualDistanceKm: '8.2',
        rawFareVnd: 90_000,
        finalFareVnd: 100_000,
        rideRequest: {
          pickupAddress: 'Real pickup',
          dropoffAddress: 'Real drop-off',
        },
      },
    });
    getPaymentMethods.mockResolvedValue([
      {
        paymentMethodId: 8,
        brand: 'VISA',
        lastFour: '4821',
        isDefault: true,
      },
    ]);
    processRidePayment.mockResolvedValue({ tripId: 22, status: 'completed' });

    const { container } = render(
      <MemoryRouter initialEntries={['/payment']}>
        <Routes>
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/invoice" element={<div>Invoice destination</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Real pickup')).toBeInTheDocument();
    await user.click(container.querySelector('.payment-preview button'));
    await user.click(container.querySelectorAll('.payment-method-list button')[1]);
    await user.click(container.querySelector('.payment-method-confirm'));
    await user.click(
      container.querySelector('.pay-confirm'),
    );

    expect(processRidePayment).toHaveBeenCalledWith(
      expect.objectContaining({
        tripId: 22,
        paymentMethod: 'CASH',
        password: '',
      }),
    );
    expect(processRidePayment.mock.calls[0][0]).not.toHaveProperty(
      'paymentMethodId',
    );
  });
});
