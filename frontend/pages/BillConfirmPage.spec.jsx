import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRideRequest,
  estimateRide,
  getActiveRide,
} from '../api/rides.js';
import BillConfirmPage from './BillConfirmPage.jsx';
import { buildBillConfirmQuery } from '../utils/rideRouteState.js';

vi.mock('../api/rides.js', () => ({
  createRideRequest: vi.fn(),
  estimateRide: vi.fn(),
  getActiveRide: vi.fn(),
}));

vi.mock('../api/customers.js', () => ({
  fetchCustomerProfile: vi.fn().mockResolvedValue(null),
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
    localStorage.setItem('jpTaxiLanguage', 'vi');
    sessionStorage.clear();
  });

  it('shows an empty state when no route was selected', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/bill-confirm']}>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(container.querySelector('.empty-state')).toBeInTheDocument();
    expect(estimateRide).not.toHaveBeenCalled();
  });

  it('shows the server estimate error without a fallback fare', async () => {
    estimateRide.mockRejectedValue(new Error('Routing provider unavailable.'));

    const { container } = render(
      <MemoryRouter initialEntries={[`/bill-confirm?${buildBillConfirmQuery(selectedRoute)}`]}>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/VND/)).not.toBeInTheDocument();
    expect(container.querySelector('.primary-button')).toBeDisabled();
  });

  it('validates proxy passenger data and submits no client-side fare', async () => {
    const user = userEvent.setup();
    estimateRide.mockResolvedValue({
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      fareVnd: 131_000,
      path: selectedRoute.routePath,
    });
    createRideRequest.mockResolvedValue({ requestId: 77 });
    getActiveRide.mockResolvedValue(null);

    const { container } = render(
      <MemoryRouter initialEntries={[`/bill-confirm?${buildBillConfirmQuery(selectedRoute)}`]}>
        <Routes>
          <Route path="/bill-confirm" element={<BillConfirmPage />} />
          <Route path="/search-car" element={<div>Driver search</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/131,000 VND/);
    const modeButtons = container.querySelectorAll('.mode-button');
    await user.click(modeButtons[1]);
    await user.click(container.querySelector('.primary-button'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(createRideRequest).not.toHaveBeenCalled();

    const textboxes = screen.getAllByRole('textbox');
    await user.type(textboxes[1], 'Proxy Rider');
    await user.type(textboxes[2], '0901888888');
    await user.click(container.querySelector('.primary-button'));

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
    await waitFor(() => {
      expect(container.querySelector('.modal-backdrop')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /tìm tài xế|配車/i })).toHaveAttribute('href', '/search-car?requestId=77');
  });

  it('renders the reference vehicle and fare cards from the server estimate', async () => {
    estimateRide.mockResolvedValue({
      distanceMeters: 8_200,
      durationSeconds: 1_500,
      rawFareVnd: 121_000,
      serviceFeeVnd: 10_000,
      fareVnd: 131_000,
      path: selectedRoute.routePath,
    });

    const { container } = render(
      <MemoryRouter initialEntries={[`/bill-confirm?${buildBillConfirmQuery(selectedRoute)}`]}>
        <BillConfirmPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/121,000 VND/)).toBeInTheDocument();
    expect(screen.getByText(/10,000 VND/)).toBeInTheDocument();
    expect(screen.getByText(/131,000 VND/)).toBeInTheDocument();
    expect(container.querySelector('.vehicle-card')).toBeInTheDocument();
    expect(container.querySelector('.fare-card')).toBeInTheDocument();
  });
});
