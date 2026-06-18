import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDriverProfile } from '../api/accounts.js';
import { getDrivingRoute } from '../api/maps.js';
import {
  getActiveDriverRide,
  requestDriverPayment,
  updateDriverLocation,
} from '../api/rides.js';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import DriverRideStatusPage from './DriverRideStatusPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getDriverProfile: vi.fn(),
  resolveAssetUrl: vi.fn((url) => url || ''),
}));

vi.mock('../api/maps.js', () => ({
  getDrivingRoute: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  cancelDriverRide: vi.fn(),
  getActiveDriverRide: vi.fn(),
  requestDriverPayment: vi.fn(),
  updateDriverLocation: vi.fn(),
}));

vi.mock('../components/InteractiveRouteMap.jsx', () => ({
  default: () => <div data-testid="driver-trip-map" />,
}));

function buildActiveTrip() {
  return {
    type: 'trip',
    data: {
      tripId: 91,
      passenger: {
        customerId: 1,
        name: 'Nguyen An',
        phone: '0901000001',
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
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <DriverRideStatusPage />
      </I18nProvider>
    </MemoryRouter>,
  );
}

describe('DriverRideStatusPage', () => {
  let watchSuccess;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jpTaxiLanguage', 'ja');
    watchSuccess = undefined;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((success) => {
          watchSuccess = success;
          return 7;
        }),
        clearWatch: vi.fn(),
      },
    });
    getDriverProfile.mockResolvedValue({
      firstName: 'Hiro',
      lastName: 'Le',
    });
    getDrivingRoute.mockResolvedValue({
      path: [[21.03, 105.85], [21.01, 105.78]],
      distanceMeters: 8_000,
      durationSeconds: 1_400,
    });
    getActiveDriverRide.mockResolvedValue(buildActiveTrip());
    requestDriverPayment.mockResolvedValue({ paymentRequested: true });
    updateDriverLocation.mockResolvedValue({});
  });

  it('renders the active trip, uses a static pickup-to-destination route, and can request payment', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    expect(await screen.findByText('Nguyen An')).toBeInTheDocument();
    expect(screen.getByTestId('driver-trip-map')).toBeInTheDocument();
    expect(container.querySelector('.tracking-call')).toHaveAttribute(
      'href',
      '/messages/customer?peerId=1',
    );

    await waitFor(() => {
      expect(getDrivingRoute).toHaveBeenCalledTimes(1);
      expect(getDrivingRoute).toHaveBeenCalledWith(
        [21.03, 105.85],
        [21.01, 105.78],
      );
    });
    expect(await screen.findByText('8.0 km')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: /支払いを依頼|request payment/i,
    }));

    expect(requestDriverPayment).toHaveBeenCalledWith(91);
    expect(await screen.findByText(
      'お客様に支払い依頼を送信しました。',
    )).toBeInTheDocument();
  });

  it('updates driver location from geolocation without recalculating the route', async () => {
    renderPage();

    expect(await screen.findByText('Nguyen An')).toBeInTheDocument();
    await waitFor(() => expect(getDrivingRoute).toHaveBeenCalledTimes(1));

    watchSuccess({
      coords: { latitude: 21.04, longitude: 105.86, accuracy: 20 },
    });

    await waitFor(() => {
      expect(updateDriverLocation).toHaveBeenCalledWith({
        lat: 21.04,
        lng: 105.86,
      });
    });
    expect(getDrivingRoute).toHaveBeenCalledTimes(1);

    watchSuccess({
      coords: { latitude: 21.04001, longitude: 105.86001, accuracy: 20 },
    });

    await waitFor(() => expect(updateDriverLocation).toHaveBeenCalledTimes(1));
    expect(getDrivingRoute).toHaveBeenCalledTimes(1);
  });

  it('shows a route-specific error instead of the generic server error when routing fails', async () => {
    getDrivingRoute.mockRejectedValue({
      code: 'INTERNAL_ERROR',
      status: 500,
      message: 'Internal server error',
    });
    const { container } = renderPage();

    expect(await screen.findByText('Nguyen An')).toBeInTheDocument();
    expect(await screen.findByText('ルートを読み込めませんでした。')).toBeInTheDocument();
    expect(screen.queryByText('サーバーでエラーが発生しました。')).not.toBeInTheDocument();
    expect(container.querySelector('.driver-tracking-card')).toBeInTheDocument();
  });
});
