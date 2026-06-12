import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCustomerProfile } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import { getActiveRide } from '../api/rides.js';
import RideStatusPage from './RideStatusPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getCustomerProfile: vi.fn(),
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/maps.js', () => ({
  getDrivingRoute: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  getActiveRide: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="trip-map" />,
}));

describe('RideStatusPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCustomerProfile.mockResolvedValue({
      firstName: 'An',
      lastName: 'Nguyen',
    });
    getDrivingRoute.mockResolvedValue({ path: [[21.03, 105.85], [21.01, 105.78]] });
  });

  it('renders the active trip tracking interface', async () => {
    getActiveRide.mockResolvedValue({
      type: 'trip',
      paymentRequested: false,
      data: {
        tripId: 91,
        driver: {
          driverId: 2,
          name: 'Le Hiro',
          location: { latitude: 21.02, longitude: 105.82 },
        },
        vehicle: {
          brand: 'Toyota',
          color: 'White',
          licensePlate: '30A-123.45',
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
        <RideStatusPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Le Hiro')).toBeInTheDocument();
    expect(screen.getByTestId('trip-map')).toBeInTheDocument();
    expect(screen.getByText('Toyota / White')).toBeInTheDocument();
    expect(screen.getByText('30A-123.45')).toBeInTheDocument();
    expect(container.querySelector('.tracking-message')).toHaveAttribute(
      'href',
      '/messages/driver?peerId=2',
    );
  });

  it('renders the reference tracking card with route metrics from the route API', async () => {
    getDrivingRoute.mockResolvedValue({
      path: [[21.03, 105.85], [21.01, 105.78]],
      distanceMeters: 8_200,
      durationSeconds: 1_500,
    });
    getActiveRide.mockResolvedValue({
      type: 'trip',
      paymentRequested: false,
      data: {
        tripId: 91,
        driver: {
          driverId: 2,
          name: 'Le Hiro',
          location: { latitude: 21.02, longitude: 105.82 },
        },
        vehicle: {
          brand: 'Toyota',
          color: 'White',
          licensePlate: '30A-123.45',
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
        <RideStatusPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('8.2 km')).toBeInTheDocument();
    expect(container.querySelector('.tracking-card')).toBeInTheDocument();
    expect(container.querySelector('.tracking-eta-header')).toBeInTheDocument();
  });
});
