import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { getActiveRide } from '../api/rides.js';
import RideConfirmPage from './RideConfirmPage.jsx';

vi.mock('../api/accounts.js', () => ({
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/rides.js', () => ({
  getActiveRide: vi.fn(),
}));

describe('RideConfirmPage', () => {
  it('renders the assigned driver, vehicle and route', async () => {
    getActiveRide.mockResolvedValue({
      type: 'trip',
      data: {
        driver: { name: 'Le Hiro', japaneseLevel: 'N2', rating: 4.8 },
        vehicle: {
          brand: 'Toyota',
          color: 'White',
          licensePlate: '30A-123.45',
        },
        rideRequest: {
          pickupAddress: 'Hoan Kiem Lake',
          dropoffAddress: 'Keangnam Landmark 72',
        },
      },
    });

    render(
      <MemoryRouter>
        <RideConfirmPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Le Hiro')).toBeInTheDocument();
    expect(screen.getByText('30A-123.45')).toBeInTheDocument();
    expect(screen.getByText('Hoan Kiem Lake')).toBeInTheDocument();
    expect(screen.getByText('Keangnam Landmark 72')).toBeInTheDocument();
    expect(screen.getByText(/4.8/)).toBeInTheDocument();
    expect(screen.getByText(/verify the license plate and driver name/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact driver' }))
      .toHaveAttribute('href', '/messages/driver');
    expect(document.querySelector('.ride-confirm-screen')).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: /start ride/i,
    })).toHaveAttribute('href', '/ride-status');
  });
});
