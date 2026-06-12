import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDriverProfile } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import {
  getActiveDriverRide,
  requestDriverPayment,
} from '../api/rides.js';
import DriverRideStatusPage from './DriverRideStatusPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getDriverProfile: vi.fn(),
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/maps.js', () => ({
  getDrivingRoute: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  cancelDriverRide: vi.fn(),
  getActiveDriverRide: vi.fn(),
  requestDriverPayment: vi.fn(),
  updateDriverLocation: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="driver-trip-map" />,
}));

describe('DriverRideStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDriverProfile.mockResolvedValue({
      firstName: 'Hiro',
      lastName: 'Le',
    });
    getDrivingRoute.mockResolvedValue({
      path: [[21.03, 105.85], [21.01, 105.78]],
    });
    requestDriverPayment.mockResolvedValue({ paymentRequested: true });
  });

  it('renders the active trip and can request customer payment', async () => {
    const user = userEvent.setup();
    getActiveDriverRide.mockResolvedValue({
      type: 'trip',
      data: {
        tripId: 91,
        passenger: {
          customerId: 1,
          name: 'Nguyen An',
          phone: '0901000001',
        },
        rideRequest: {
          requestId: 77,
          pickupAddress: 'Hoan Kiem Lake',
          pickupLat: 21.03,
          pickupLng: 105.85,
          dropoffAddress: 'Keangnam Landmark 72',
          dropoffLat: 21.01,
          dropoffLng: 105.78,
        },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <DriverRideStatusPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Nguyen An')).toBeInTheDocument();
    expect(screen.getByTestId('driver-trip-map')).toBeInTheDocument();
    expect(container.querySelector('.tracking-call')).toHaveAttribute(
      'href',
      '/messages/customer?peerId=1',
    );

    await user.click(screen.getByRole('button', {
      name: /request payment/i,
    }));

    expect(requestDriverPayment).toHaveBeenCalledWith(91);
    expect(await screen.findByText(
      'Payment request sent to the customer.',
    )).toBeInTheDocument();
  });

  it('shows the reference ETA card using route API metrics', async () => {
    getDrivingRoute
      .mockResolvedValueOnce({
        path: [[21.02, 105.84], [21.03, 105.85]],
        distanceMeters: 1_000,
        durationSeconds: 300,
      })
      .mockResolvedValueOnce({
        path: [[21.03, 105.85], [21.01, 105.78]],
        distanceMeters: 8_000,
        durationSeconds: 1_400,
      });
    getActiveDriverRide.mockResolvedValue({
      type: 'trip',
      data: {
        tripId: 91,
        passenger: {
          customerId: 1,
          name: 'Nguyen An',
          phone: '0901000001',
        },
        rideRequest: {
          requestId: 77,
          pickupAddress: 'Hoan Kiem Lake',
          pickupLat: 21.03,
          pickupLng: 105.85,
          dropoffAddress: 'Keangnam Landmark 72',
          dropoffLat: 21.01,
          dropoffLng: 105.78,
        },
      },
    });

    const { container } = render(
      <MemoryRouter>
        <DriverRideStatusPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('9.0 km')).toBeInTheDocument();
    expect(container.querySelector('.tracking-eta-header')).toBeInTheDocument();
    expect(container.querySelector('.driver-tracking-card')).toBeInTheDocument();
  });
});
