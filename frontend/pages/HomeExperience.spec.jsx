import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCustomerProfile } from '../api/accounts.js';
import { getSavedPlaces } from '../api/customers.js';
import { getActiveRide } from '../api/rides.js';
import HomeExperience from './HomeExperience.jsx';

vi.mock('../api/accounts.js', () => ({
  getCustomerProfile: vi.fn(),
  getDriverProfile: vi.fn(),
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/customers.js', () => ({
  getSavedPlaces: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  getActiveDriverRide: vi.fn(),
  getActiveRide: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="route-map" />,
}));

describe('HomeExperience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveRide.mockResolvedValue(null);
    getCustomerProfile.mockResolvedValue({
      firstName: 'An',
      lastName: 'Nguyen',
    });
    getSavedPlaces.mockResolvedValue([]);
  });

  it('opens the taxi confirmation page from the quick call button', async () => {
    render(
      <MemoryRouter>
        <HomeExperience mode="user" />
      </MemoryRouter>,
    );

    const quickCallLink = await screen.findByRole('link', {
      name: /book now/i,
    });

    expect(quickCallLink).toHaveAttribute('href', '/bill-confirm');
  });
});
