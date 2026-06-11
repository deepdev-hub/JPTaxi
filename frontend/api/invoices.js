import { apiRequest } from './client.js';

export function getTripInvoice(tripId) {
  return apiRequest(`/trips/${tripId}/invoice`, { auth: true });
}

export function issueTripInvoice(tripId, payload = {}) {
  return apiRequest('/invoice/issue', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ tripId, ...payload }),
  });
}

export function downloadTripInvoicePdf(tripId) {
  return apiRequest(`/invoice/pdf?tripId=${encodeURIComponent(tripId)}`, {
    responseType: 'blob',
  });
}

export function emailTripInvoice(tripId, payload = {}) {
  return apiRequest('/invoice/email', {
    method: 'POST',
    body: JSON.stringify({ tripId, ...payload }),
  });
}
