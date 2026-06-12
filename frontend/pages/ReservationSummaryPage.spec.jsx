import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveRide } from '../api/rides.js';
import ReservationSummaryPage from './ReservationSummaryPage.jsx';

vi.mock('../api/rides.js', () => ({
  getActiveRide: vi.fn(),
}));

describe('ReservationSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders the persisted request and the calculated route metrics', async () => {
    sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
      pickup: { name: 'Pickup', address: 'Real pickup address', position: [21, 105] },
      destination: { name: 'Destination', address: 'Real destination address', position: [21.1, 105.1] },
      routePath: [[21, 105], [21.1, 105.1]],
      routeMetrics: {
        distanceMeters: 8_200,
        durationSeconds: 1_500,
      },
    }));
    getActiveRide.mockResolvedValue({
      type: 'request',
      data: {
        requestId: 44,
        pickupAddress: 'Real pickup address',
        dropoffAddress: 'Real destination address',
        vehicleType: '4',
        rawFareVnd: 90_000,
        estimatedFareVnd: 100_000,
      },
    });

    render(
      <MemoryRouter>
        <ReservationSummaryPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Real pickup address')).toBeInTheDocument();
    expect(screen.getByText('Real destination address')).toBeInTheDocument();
    expect(screen.getByText('8.2 km')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('100,000 VND')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reservation summary' })).toBeInTheDocument();
    expect(document.querySelector('.reservation-summary-screen')).toBeInTheDocument();
    expect(screen.queryByText(/Noi Bai/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find a driver/i }))
      .toHaveAttribute('href', '/search-car');
  });
});
