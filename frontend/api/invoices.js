import { apiRequest } from './client.js';

export function getTripInvoice(tripId) {
  return apiRequest(`/trips/${tripId}/invoice`, { auth: true });
}

export function issueTripInvoice(tripId, payload = {}) {
  return apiRequest(`/trips/${tripId}/invoice/issue`, {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}
