import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActiveRideRedirect,
  getRideContinuationPath,
  hasOutstandingPayment,
  syncActiveRideSession,
} from './activeRideNavigation.js';

describe('active ride navigation', () => {
  beforeEach(() => sessionStorage.clear());

  it('uses the API paymentRequested flag without a local fallback', () => {
    const activeRide = {
      type: 'trip',
      paymentRequested: true,
      data: {
        tripId: 42,
        actualDistanceKm: '8.2',
        finalFareJpy: 588,
        rideRequest: {
          requestId: 9,
          customerId: 1,
          pickupAddress: 'Pickup',
          pickupLat: '21.0',
          pickupLng: '105.8',
          dropoffAddress: 'Drop-off',
          dropoffLat: '21.1',
          dropoffLng: '105.9',
        },
      },
    };

    expect(hasOutstandingPayment(activeRide)).toBe(true);
    expect(getRideContinuationPath('customer', activeRide)).toBe('/payment');
    syncActiveRideSession(activeRide);
    expect(sessionStorage.getItem('jpTaxiTripId')).toBe('42');
  });

  it('allows the customer to view the assigned-driver confirmation', () => {
    const activeRide = {
      type: 'trip',
      paymentRequested: false,
      data: { tripId: 42 },
    };

    expect(
      getActiveRideRedirect('customer', activeRide, '/ride-confirm'),
    ).toBeNull();
  });
});
