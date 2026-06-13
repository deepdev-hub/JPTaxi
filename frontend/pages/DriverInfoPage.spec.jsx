import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getDriverProfile } from '../api/accounts.js';
import {
  getDriverInsurance,
  getDriverPayouts,
  setDriverAvailability,
  updateDriverInsurance,
} from '../api/drivers.js';
import { updateDriverLocation } from '../api/rides.js';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import DriverInfoPage, { formatTripStatus } from './DriverInfoPage.jsx';

vi.mock('../api/accounts.js', () => ({
  getDriverProfile: vi.fn(),
  resolveAssetUrl: (value) => value || '',
  updateDriverBankAccount: vi.fn(),
  updateDriverDocuments: vi.fn(),
  updateDriverProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  uploadDriverDocument: vi.fn(),
}));

vi.mock('../api/drivers.js', () => ({
  getDriverInsurance: vi.fn(),
  getDriverPayouts: vi.fn(),
  setDriverAvailability: vi.fn(),
  updateDriverInsurance: vi.fn(),
}));

vi.mock('../api/rides.js', () => ({
  updateDriverLocation: vi.fn(),
}));

vi.mock('../api/ratings.js', () => ({
  getDriverRatings: vi.fn().mockResolvedValue({ items: [] }),
  getDriverRatingsSummary: vi.fn().mockResolvedValue({ averageScore: null, ratingCount: 0 }),
  getPublicDriverRatingSummary: vi.fn().mockResolvedValue({ averageScore: null, ratingCount: 0 }),
}));

vi.mock('../api/auth.js', () => ({
  changePassword: vi.fn(),
}));

describe('DriverInfoPage payout localization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('jpTaxiLanguage', 'ja');
    getDriverProfile.mockResolvedValue({
      firstName: 'Hiro',
      lastName: 'Le',
      bankAccount: null,
      documents: {},
      licenses: [],
      trips: [],
      status: 'approved',
      isOnline: false,
    });
    getDriverInsurance.mockResolvedValue({ insurance: null, status: 'missing' });
    getDriverPayouts.mockResolvedValue({
      items: [],
      totals: {
        grossFareVnd: 1234.5,
        commissionVnd: 200,
        netAmountVnd: 1034.5,
      },
    });
  });

  it('stores a current location before enabling driver availability', async () => {
    navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn((success) => {
        success({
          coords: { latitude: 21.03, longitude: 105.85, accuracy: 20 },
        });
        return 7;
      }),
      clearWatch: vi.fn(),
    };
    updateDriverLocation.mockResolvedValue({});
    setDriverAvailability.mockResolvedValue({ isOnline: true });

    render(
      <MemoryRouter initialEntries={['/driver-info/basic']}>
        <I18nProvider>
          <Routes>
            <Route path="/driver-info/:section" element={<DriverInfoPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    const toggle = await screen.findByRole('checkbox');
    setDriverAvailability.mockClear();
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(updateDriverLocation).toHaveBeenCalledWith({
        lat: 21.03,
        lng: 105.85,
      });
      expect(setDriverAvailability).toHaveBeenCalledWith(true);
      expect(toggle).toBeChecked();
    });
  });

  it('keeps the driver offline when browser location permission fails', async () => {
    localStorage.setItem('jpTaxiLanguage', 'en');
    navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn((_success, failure) => {
        failure(new Error('denied'));
        return 8;
      }),
      clearWatch: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={['/driver-info/basic']}>
        <I18nProvider>
          <Routes>
            <Route path="/driver-info/:section" element={<DriverInfoPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    const toggle = await screen.findByRole('checkbox');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(toggle).not.toBeChecked();
      expect(setDriverAvailability).not.toHaveBeenCalled();
      expect(screen.getByText(/current location is unavailable/i)).toBeInTheDocument();
    });
  });

  it('opens a real insurance form without reusing an earlier page error', async () => {
    localStorage.setItem('jpTaxiLanguage', 'en');
    getDriverProfile.mockRejectedValueOnce(new Error('old error'));

    render(
      <MemoryRouter initialEntries={['/driver-info/basic']}>
        <I18nProvider>
          <Routes>
            <Route path="/driver-info/:section" element={<DriverInfoPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: /voluntary insurance/i }));

    expect(await screen.findByLabelText(/insurance provider/i)).toBeInTheDocument();
    expect(screen.queryByText(/check the request/i)).not.toBeInTheDocument();
    expect(updateDriverInsurance).not.toHaveBeenCalled();
  });

  it('renders payout labels and numbers with the selected locale', async () => {
    render(
      <MemoryRouter initialEntries={['/driver-info/payout']}>
        <I18nProvider>
          <Routes>
            <Route path="/driver-info/:section" element={<DriverInfoPage />} />
          </Routes>
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('総運賃')).toBeInTheDocument();
    expect(screen.getByText('1,234.5 VND')).toBeInTheDocument();
    expect(screen.getByText('銀行口座が設定されていません。')).toBeInTheDocument();
    expect(screen.getByText('振込履歴はまだありません。')).toBeInTheDocument();
  });
});

describe('formatTripStatus', () => {
  it('uses the selected language catalog for system statuses', () => {
    const t = (key) => ({
      'trip.status.completed': 'Đã hoàn thành',
      'trip.status.ongoing': 'Đang trong chuyến',
      'trip.status.cancelled': 'Đã hủy',
    })[key] || key;

    expect(formatTripStatus('completed', t)).toBe('Đã hoàn thành');
    expect(formatTripStatus('ongoing', t)).toBe('Đang trong chuyến');
    expect(formatTripStatus('cancelled', t)).toBe('Đã hủy');
  });
});
