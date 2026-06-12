import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDriverProfile } from '../api/accounts.js';
import {
  acceptDriverRide,
  getPendingDriverRide,
  rejectDriverRide,
  updateDriverLocation,
} from '../api/rides.js';
import { useRideSocket } from '../hooks/useRideSocket.js';
import { fetchDrivingRoute } from '../utils/routePlanner.js';
import DriverDispatchPage from './DriverDispatchPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getDriverProfile: vi.fn(),
  resolveAssetUrl: (value) => value || '',
}));

vi.mock('../api/rides.js', () => ({
  acceptDriverRide: vi.fn(),
  getPendingDriverRide: vi.fn(),
  rejectDriverRide: vi.fn(),
  updateDriverLocation: vi.fn(),
}));

vi.mock('../hooks/useRideSocket.js', () => ({
  useRideSocket: vi.fn(),
}));

vi.mock('../utils/routePlanner.js', () => ({
  fetchDrivingRoute: vi.fn(),
  formatDistance: () => '8.2 km',
  formatDuration: () => '25 min',
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="dispatch-map" />,
}));

describe('DriverDispatchPage', () => {
  let socketHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    useRideSocket.mockImplementation(({ handlers }) => {
      socketHandlers = handlers;
    });
    getDriverProfile.mockResolvedValue({
      firstName: 'Yuki',
      lastName: 'Pham',
    });
  });

  it('shows the API empty state without a sample ride', async () => {
    getPendingDriverRide.mockResolvedValue({
      request: null,
      message: 'No nearby ride requests.',
    });

    render(
      <MemoryRouter>
        <DriverDispatchPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('No dispatch offer is assigned to this driver.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /accept/i }),
    ).not.toBeInTheDocument();
  });

  it('shows a polling error instead of fallback passenger data', async () => {
    getPendingDriverRide.mockRejectedValue(
      new Error('Dispatch API unavailable.'),
    );

    render(
      <MemoryRouter>
        <DriverDispatchPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Passenger/)).not.toBeInTheDocument();
  });

  it('uses the reference dispatch layout with only API profile and request data', async () => {
    getPendingDriverRide.mockResolvedValue({
      radiusKm: 2,
      offerExpiresAt: new Date(Date.now() + 30_000).toISOString(),
      request: {
        requestId: 88,
        pickupAddress: 'Real pickup',
        pickupLat: 21.02,
        pickupLng: 105.85,
        dropoffAddress: 'Real drop-off',
        dropoffLat: 21.08,
        dropoffLng: 105.8,
        distanceKm: 1.25,
        customer: {
          name: 'Tran Mai',
          phone: '0901000002',
        },
      },
    });
    fetchDrivingRoute.mockResolvedValue({
      distance: 8_200,
      duration: 1_500,
      routePath: [[21.02, 105.85], [21.08, 105.8]],
    });

    const { container } = render(
      <MemoryRouter>
        <DriverDispatchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tran Mai')).toBeInTheDocument();
    expect(screen.getByText('Pham Yuki')).toBeInTheDocument();
    expect(container.querySelector('.dispatch-driver-box')).toBeInTheDocument();
    expect(container.querySelector('.dispatch-floating-details')).toBeInTheDocument();
    expect(screen.getByText(/30s|29s/)).toBeInTheDocument();
    expect(screen.queryByText(/sample/i)).not.toBeInTheDocument();
  });

  it('accepts the real request and stores the returned trip', async () => {
    const user = userEvent.setup();
    getPendingDriverRide.mockResolvedValue({
      request: {
        requestId: 88,
        pickupAddress: 'Real pickup',
        pickupLat: 21.02,
        pickupLng: 105.85,
        dropoffAddress: 'Real drop-off',
        dropoffLat: 21.08,
        dropoffLng: 105.8,
        distanceKm: 1.25,
        customer: {
          name: 'Tran Mai',
          phone: '0901000002',
        },
      },
    });
    fetchDrivingRoute.mockResolvedValue({
      distance: 8_200,
      duration: 1_500,
      routePath: [
        [21.02, 105.85],
        [21.08, 105.8],
      ],
    });
    acceptDriverRide.mockResolvedValue({ tripId: 99 });

    render(
      <MemoryRouter initialEntries={['/driver-dispatch']}>
        <Routes>
          <Route path="/driver-dispatch" element={<DriverDispatchPage />} />
          <Route
            path="/driver-ride-status"
            element={<div>Driver trip status</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tran Mai')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /accept/i }));

    expect(acceptDriverRide).toHaveBeenCalledWith(88);
    expect(sessionStorage.getItem('jpTaxiRideRequestId')).toBe('88');
    expect(sessionStorage.getItem('jpTaxiTripId')).toBe('99');
    expect(await screen.findByText('Driver trip status')).toBeInTheDocument();
    expect(rejectDriverRide).not.toHaveBeenCalled();
    expect(updateDriverLocation).not.toHaveBeenCalled();
  });

  it('preserves the timeout message when polling confirms the offer is gone', async () => {
    getPendingDriverRide
      .mockResolvedValueOnce({
        radiusKm: 2,
        offerExpiresAt: new Date(Date.now() + 30_000).toISOString(),
        request: {
          requestId: 88,
          pickupAddress: 'Real pickup',
          pickupLat: 21.02,
          pickupLng: 105.85,
          dropoffAddress: 'Real drop-off',
          dropoffLat: 21.08,
          dropoffLng: 105.8,
          distanceKm: 1.25,
          customer: {
            name: 'Tran Mai',
            phone: '0901000002',
          },
        },
      })
      .mockResolvedValue({ request: null });
    fetchDrivingRoute.mockResolvedValue({
      distance: 8_200,
      duration: 1_500,
      routePath: [[21.02, 105.85], [21.08, 105.8]],
    });

    render(
      <MemoryRouter>
        <DriverDispatchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Tran Mai')).toBeInTheDocument();
    act(() => {
      socketHandlers.dispatchOfferExpired({ requestId: 88 });
    });
    expect(
      screen.getByText('The offer expired. Waiting for another ride request...'),
    ).toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2_100));
    });

    expect(
      screen.getByText('The offer expired. Waiting for another ride request...'),
    ).toBeInTheDocument();
  });
});
