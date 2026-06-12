import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRideRequest,
  estimateRide,
  getActiveRide,
} from '../api/rides.js';
import BillConfirmPage from './BillConfirmPage.jsx';

vi.mock('../api/rides.js', () => ({
  createRideRequest: vi.fn(),
  estimateRide: vi.fn(),
  getActiveRide: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="route-map" />,
}));

const selectedRoute = {
  pickup: {
    name: 'Pickup',
    address: 'Real pickup address',
    position: [21.028511, 105.852],
  },
  destination: {
    name: 'Destination',
    address: 'Real destination address',
    position: [21.0167, 105.7847],
  },
  routePath: [
    [21.028511, 105.852],
    [21.0167, 105.7847],
  ],
};

describe('BillConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows an empty state when no route was selected', () => {
    render(
      <MemoryRouter>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No route selected.')).toBeInTheDocument();
    expect(estimateRide).not.toHaveBeenCalled();
  });

  it('shows the server estimate error without a fallback fare', async () => {
    sessionStorage.setItem(
      'jpTaxiSelectedRoute',
      JSON.stringify(selectedRoute),
    );
    estimateRide.mockRejectedValue(new Error('Routing provider unavailable.'));

    render(
      <MemoryRouter>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText('Unable to calculate the fare.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/VND/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /confirm booking/i }),
    ).toBeDisabled();
  });

  it('validates proxy passenger data and submits no client-side fare', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      'jpTaxiSelectedRoute',
      JSON.stringify(selectedRoute),
    );
    estimateRide.mockResolvedValue({
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      fareVnd: 131_000,
      path: selectedRoute.routePath,
    });
    createRideRequest.mockResolvedValue({ requestId: 77 });
    getActiveRide.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={['/bill-confirm']}>
        <Routes>
          <Route path="/bill-confirm" element={<BillConfirmPage />} />
          <Route path="/reservation-summary" element={<div>Reservation summary</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('131,000 VND')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /for someone else/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /confirm booking/i }),
    );
    expect(
      screen.getByText('Enter the passenger name and phone number.'),
    ).toBeInTheDocument();
    expect(createRideRequest).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/passenger name/i), 'Proxy Rider');
    await user.type(screen.getByLabelText(/passenger phone/i), '0901888888');
    await user.click(
      screen.getByRole('button', { name: /confirm booking/i }),
    );

    expect(createRideRequest).toHaveBeenCalledWith({
      pickupAddress: 'Real pickup address',
      pickupLat: 21.028511,
      pickupLng: 105.852,
      dropoffAddress: 'Real destination address',
      dropoffLat: 21.0167,
      dropoffLng: 105.7847,
      vehicleType: '4',
      noteToDriver: '',
      actualPassengerName: 'Proxy Rider',
      actualPassengerPhone: '0901888888',
    });
    expect(await screen.findByText('Reservation summary')).toBeInTheDocument();
  });

  it('renders the reference vehicle and fare cards from the server estimate', async () => {
    sessionStorage.setItem(
      'jpTaxiSelectedRoute',
      JSON.stringify(selectedRoute),
    );
    estimateRide.mockResolvedValue({
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      rawFareVnd: 121_000,
      serviceFeeVnd: 10_000,
      fareVnd: 131_000,
      path: selectedRoute.routePath,
    });

    const { container } = render(
      <MemoryRouter>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('121,000 VND')).toBeInTheDocument();
    expect(screen.getByText('10,000 VND')).toBeInTheDocument();
    expect(screen.getByText('131,000 VND')).toBeInTheDocument();
    expect(container.querySelector('.vehicle-card')).toBeInTheDocument();
    expect(container.querySelector('.fare-card')).toBeInTheDocument();
  });
});
