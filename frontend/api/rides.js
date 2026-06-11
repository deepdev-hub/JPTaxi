import { apiRequest } from './client.js';
import { getCurrentCustomerId, getCurrentDriverId } from './accounts.js';

const FALLBACK_RIDE_KEY = 'jpTaxiFallbackRide';

export function createRideRequest(payload) {
  return apiRequest('/ride/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getActiveRide() {
  return apiRequest('/ride/active');
}

export function getActiveDriverRide() {
  return apiRequest('/ride/driver/active');
}

export function cancelRideRequest(requestId) {
  return apiRequest(`/ride/cancel/${requestId}`, {
    method: 'POST',
  });
}

export function getPendingDriverRide() {
  return apiRequest('/ride/driver/pending');
}

export function updateDriverLocation(payload) {
  return apiRequest('/ride/driver/location', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function acceptDriverRide(requestId) {
  return apiRequest(`/ride/driver/accept/${requestId}`, {
    method: 'POST',
  });
}

export function rejectDriverRide(requestId) {
  return apiRequest(`/ride/driver/reject/${requestId}`, {
    method: 'POST',
  });
}

export function requestDriverPayment(tripId) {
  return apiRequest(`/ride/driver/request-payment/${tripId}`, {
    method: 'POST',
  });
}

export function cancelDriverRide(tripId) {
  return apiRequest(`/ride/driver/cancel/${tripId}`, {
    method: 'POST',
  });
}

export function processRidePayment(payload) {
  return apiRequest('/ride/pay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function buildFallbackRide(status = 'ongoing') {
  return {
    tripId: 1,
    requestId: Number(sessionStorage.getItem('jpTaxiRideRequestId')) || 1,
    status,
    requestStatus: status === 'cancelled' ? 'failed' : 'assigned',
    cancelledBy: status === 'cancelled' ? 'driver' : null,
    passenger: {
      customerId: getCurrentCustomerId(),
      name: 'JPTX-9821',
      phone: '090-1234-5678',
      noteToDriver: null,
    },
    driver: {
      driverId: getCurrentDriverId(),
      name: 'JP Taxi Driver',
      phone: '070-0000-0001',
      avatarUrl: null,
    },
    trip: {
      startTime: new Date().toISOString(),
      endTime: status === 'cancelled' ? new Date().toISOString() : null,
      distanceKm: 4.8,
      finalFareVnd: 98000,
      finalFareJpy: 680,
    },
  };
}

export function setFallbackAcceptedRide() {
  const ride = buildFallbackRide('ongoing');
  localStorage.setItem(FALLBACK_RIDE_KEY, JSON.stringify(ride));
  return ride;
}

export function getFallbackRide() {
  try {
    const raw = localStorage.getItem(FALLBACK_RIDE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function cancelFallbackRide() {
  const ride = buildFallbackRide('cancelled');
  localStorage.setItem(FALLBACK_RIDE_KEY, JSON.stringify(ride));
  return ride;
}

export function clearFallbackRide() {
  localStorage.removeItem(FALLBACK_RIDE_KEY);
}
