import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveRide } from '../api/rides.js';
import SearchCarPage from './SearchCarPage.jsx';

vi.mock('../api/rides.js', () => ({
  cancelRideRequest: vi.fn(),
  getActiveRide: vi.fn(),
}));

vi.mock('../hooks/useRideSocket.js', () => ({
  useRideSocket: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="route-map" />,
}));

describe('SearchCarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jpTaxiLanguage', 'en');
    sessionStorage.clear();
    sessionStorage.setItem('jpTaxiRideRequestId', '77');
    sessionStorage.setItem('jpTaxiSelectedRoute', JSON.stringify({
      pickup: {
        name: 'Pickup',
        address: 'Hoan Kiem Lake, Hanoi',
        position: [21.03, 105.85],
      },
      destination: { name: 'Destination', position: [21.01, 105.78] },
      routePath: [],
      routeMetrics: { distance: '8.2 km', duration: '25 min' },
    }));
  });

  it('uses the backend dispatch radius instead of searching drivers directly', async () => {
    getActiveRide.mockResolvedValue({
      type: 'request',
      data: { requestId: 77 },
      dispatch: {
        phase: 'waiting_driver',
        radiusKm: 3,
        offerExpiresAt: '2099-01-01T00:00:30.000Z',
      },
    });

    const { container } = render(
      <MemoryRouter>
        <SearchCarPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Hoan Kiem Lake, Hanoi')).toBeInTheDocument();
    expect(await screen.findByText(/3 km/i)).toBeInTheDocument();
    expect(container.querySelector('.location-chip')).toBeInTheDocument();
    expect(screen.queryByText(/lotte hotel/i)).not.toBeInTheDocument();
  });

  it('opens trip tracking after a driver accepts', async () => {
    getActiveRide.mockResolvedValue({
      type: 'trip',
      data: { tripId: 91 },
    });

    render(
      <MemoryRouter initialEntries={['/search-car']}>
        <Routes>
          <Route path="/search-car" element={<SearchCarPage />} />
          <Route path="/ride-status" element={<div>Trip tracking</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Trip tracking')).toBeInTheDocument();
  });
});
