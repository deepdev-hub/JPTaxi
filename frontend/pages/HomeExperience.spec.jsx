import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeExperience from './HomeExperience.jsx';
import { I18nProvider } from '../i18n/I18nProvider.jsx';

vi.mock('../api/rides.js', () => ({
  getActiveDriverRide: vi.fn(async () => null),
  getActiveRide: vi.fn(async () => null),
}));

vi.mock('../api/accounts.js', () => ({
  getCustomerProfile: vi.fn(async () => ({
    lastName: 'Nguyen',
    firstName: 'An',
    avatarUrl: null,
  })),
  getDriverProfile: vi.fn(async () => ({
    lastName: 'Driver',
    firstName: 'One',
    avatarUrl: null,
  })),
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/customers.js', () => ({
  getSavedPlaces: vi.fn(async () => ([
    {
      savedPlaceId: 1,
      type: 'home',
      label: 'Home',
      address: 'Hoan Kiem, Hanoi',
      latitude: 21.0285,
      longitude: 105.852,
    },
  ])),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="home-map" />,
}));

vi.mock('../utils/routePlanner.js', () => ({
  getCurrentPosition: vi.fn(async () => ({
    latitude: 21.0285,
    longitude: 105.852,
  })),
}));

describe('HomeExperience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jpTaxiLanguage', 'en');
  });

  it('shows saved places from the API on the customer home page', async () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <HomeExperience mode="user" />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('Home')).length).toBeGreaterThan(0);
    expect(screen.getByText('Hoan Kiem, Hanoi')).toBeInTheDocument();
  });
});
