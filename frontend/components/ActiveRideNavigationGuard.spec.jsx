import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveRide } from '../api/rides.js';
import ActiveRideNavigationGuard from './ActiveRideNavigationGuard.jsx';

vi.mock('../api/rides.js', () => ({
  getActiveDriverRide: vi.fn(),
  getActiveRide: vi.fn(),
}));

vi.mock('../utils/session.js', () => ({
  getAuthRole: () => 'customer',
  getAuthToken: () => 'token',
}));

function PaymentRoute() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/invoice?tripId=2')}>
      Complete payment
    </button>
  );
}

describe('ActiveRideNavigationGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not redirect back to payment while refreshing the completed trip', async () => {
    const user = userEvent.setup();
    getActiveRide
      .mockResolvedValue(null)
      .mockResolvedValueOnce({
        type: 'trip',
        paymentRequested: true,
        data: { tripId: 2 },
      });

    render(
      <MemoryRouter initialEntries={['/payment']}>
        <ActiveRideNavigationGuard>
          <Routes>
            <Route path="/payment" element={<PaymentRoute />} />
            <Route path="/invoice" element={<div>Invoice page</div>} />
          </Routes>
        </ActiveRideNavigationGuard>
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', {
      name: 'Complete payment',
    }));

    expect(await screen.findByText('Invoice page')).toBeInTheDocument();
  });
});
