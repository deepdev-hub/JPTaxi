import { apiRequest, API_BASE } from './client.js';

const SOCKET_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getRideSocketUrl() {
  return SOCKET_ORIGIN;
}

export function estimateRide(payload) {
  return apiRequest('/rides/estimate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createRideRequest(payload) {
  return apiRequest('/rides', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getActiveRide() {
  return apiRequest('/rides/active');
}

export function getActiveDriverRide() {
  return apiRequest('/rides/driver/active');
}

export function cancelRideRequest(requestId) {
  return apiRequest(`/rides/cancel/${requestId}`, { method: 'POST' });
}

export function getPendingDriverRide() {
  return apiRequest('/rides/driver/pending');
}

export function updateDriverLocation(payload) {
  return apiRequest('/rides/driver/location', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function acceptDriverRide(requestId) {
  return apiRequest(`/rides/driver/accept/${requestId}`, { method: 'POST' });
}

export function rejectDriverRide(requestId) {
  return apiRequest(`/rides/driver/reject/${requestId}`, { method: 'POST' });
}

export function requestDriverPayment(tripId) {
  return apiRequest(`/rides/driver/request-payment/${tripId}`, { method: 'POST' });
}

export function cancelDriverRide(tripId) {
  return apiRequest(`/rides/driver/cancel/${tripId}`, { method: 'POST' });
}

export function processRidePayment(payload) {
  return apiRequest('/rides/payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
