import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getReviewContext } from '../api/ratings.js';
import { I18nProvider } from '../i18n/I18nProvider.jsx';
import DriverReviewPage from './DriverReviewPage.jsx';

vi.mock('../api/ratings.js', () => ({
  getReviewContext: vi.fn(),
  submitTripRating: vi.fn(),
}));

describe('DriverReviewPage', () => {
  beforeEach(() => {
    localStorage.setItem('jpTaxiLanguage', 'en');
  });

  it('renders a readable review interface for the completed trip', async () => {
    getReviewContext.mockResolvedValue({
      driver: {
        name: 'Le Hiro',
        vehicle: {
          brand: 'Toyota',
          color: 'White',
          licensePlate: '30A-123.45',
        },
      },
      existingRating: null,
    });

    render(
      <MemoryRouter initialEntries={['/driver-review?tripId=91']}>
        <I18nProvider>
          <DriverReviewPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Le Hiro')).toBeInTheDocument();
    expect(screen.getByText(/Toyota White.*30A-123\.45/)).toBeInTheDocument();
    expect(await screen.findByText('How was your ride?')).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: '5.0 stars',
    })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: /submit rating/i,
    })).toBeInTheDocument();
  });

  it('localizes the clear-rating control in Japanese', async () => {
    localStorage.setItem('jpTaxiLanguage', 'ja');
    getReviewContext.mockResolvedValue({
      driver: {
        name: 'Le Hiro',
        vehicle: {
          brand: 'Toyota',
          color: 'White',
          licensePlate: '30A-123.45',
        },
      },
      existingRating: null,
    });

    render(
      <MemoryRouter initialEntries={['/driver-review?tripId=91']}>
        <I18nProvider>
          <DriverReviewPage />
        </I18nProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: '評価をクリア' })).toBeInTheDocument();
  });
});
