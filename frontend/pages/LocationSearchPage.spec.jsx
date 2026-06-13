import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addSearchHistory,
  getSavedPlaces,
  getSearchHistory,
} from '../api/customers.js';
import { reverseGeocode } from '../api/maps.js';
import { estimateRide } from '../api/rides.js';
import LocationSearchPage from './LocationSearchPage.jsx';

vi.mock('../api/customers.js', () => ({
  addSearchHistory: vi.fn(),
  clearSearchHistory: vi.fn(),
  getSavedPlaces: vi.fn(),
  getSearchHistory: vi.fn(),
}));

vi.mock('../api/maps.js', () => ({
  geocodePlaces: vi.fn(),
  reverseGeocode: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  estimateRide: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: ({ className = '', routePath = [] }) => (
    <div
      className={className}
      data-route-length={routePath.length}
      data-testid="route-map"
    />
  ),
}));

describe('LocationSearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addSearchHistory.mockResolvedValue(null);
    getSavedPlaces.mockResolvedValue([]);
    getSearchHistory.mockResolvedValue([]);
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((success) => {
          success({
            coords: { latitude: 21.0285, longitude: 105.852, accuracy: 25 },
          });
          return 1;
        }),
        clearWatch: vi.fn(),
        getCurrentPosition: vi.fn((success) => success({
          coords: { latitude: 21.0285, longitude: 105.852 },
        })),
      },
    });
  });

  it('renders the map when reverse geocoding includes a structured address', async () => {
    reverseGeocode.mockResolvedValue({
      latitude: 21.0285,
      longitude: 105.852,
      address: {
        amenity: 'Hoan Kiem Lake',
        city: 'Hanoi',
        country: 'Vietnam',
      },
    });

    render(
      <MemoryRouter>
        <LocationSearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue(
      'Hoan Kiem Lake, Hanoi, Vietnam',
    )).toBeInTheDocument();
    expect(screen.getByTestId('route-map')).toBeInTheDocument();
  });

  it('keeps the route map inside the location search layout', async () => {
    reverseGeocode.mockResolvedValue({
      latitude: 21.0285,
      longitude: 105.852,
      name: 'Current location',
      address: 'Hoan Kiem, Hanoi',
    });

    render(
      <MemoryRouter>
        <LocationSearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue('Hoan Kiem, Hanoi')).toBeInTheDocument();
    expect(screen.getByTestId('route-map')).toHaveClass('location-search-route-map');
  });

  it('uses the reference split layout without replacing API places with demo content', async () => {
    getSavedPlaces.mockResolvedValue([{
      savedPlaceId: 2,
      name: 'Work',
      address: 'Keangnam Landmark 72, Hanoi',
      latitude: 21.0173,
      longitude: 105.7841,
    }]);
    reverseGeocode.mockResolvedValue({
      latitude: 21.0285,
      longitude: 105.852,
      name: 'Current location',
      address: 'Hoan Kiem, Hanoi',
    });

    const { container } = render(
      <MemoryRouter>
        <LocationSearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Work')).toBeInTheDocument();
    expect(container.querySelector('.location-search-screen')).toBeInTheDocument();
    expect(container.querySelector('.zip-location-main')).toBeInTheDocument();
    expect(container.querySelector('.zip-location-left')).toBeInTheDocument();
    expect(container.querySelector('.zip-location-map')).toContainElement(
      screen.getByTestId('route-map'),
    );
    expect(screen.queryByText(/lotte hotel/i)).not.toBeInTheDocument();
  });

  it('announces when the selected route is ready to review', async () => {
    const user = userEvent.setup();
    getSavedPlaces.mockResolvedValue([{
      savedPlaceId: 2,
      name: 'Work',
      address: 'Keangnam Landmark 72, Hanoi',
      latitude: 21.0173,
      longitude: 105.7841,
    }]);
    reverseGeocode.mockResolvedValue({
      latitude: 21.0285,
      longitude: 105.852,
      name: 'Current location',
      address: 'Hoan Kiem, Hanoi',
    });
    estimateRide.mockResolvedValue({
      path: [[21.0285, 105.852], [21.0173, 105.7841]],
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      fareVnd: 131_000,
    });

    render(
      <MemoryRouter>
        <LocationSearchPage />
      </MemoryRouter>,
    );

    const workLabel = await screen.findByText('Work');
    await user.click(workLabel.closest('button'));

    expect(await screen.findByRole('status')).toHaveTextContent('Route ready');
    expect(screen.getByTestId('route-map')).toHaveAttribute('data-route-length', '2');
  });
});
