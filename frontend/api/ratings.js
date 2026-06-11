import { apiRequest } from './client.js';

export function getReviewContext(tripId) {
  return apiRequest(`/trips/${tripId}/rating/review-context`, { auth: true });
}

export function getTripRating(tripId) {
  return apiRequest(`/trips/${tripId}/rating`, { auth: true });
}

export function submitTripRating(tripId, payload, { update = false } = {}) {
  return apiRequest(`/trips/${tripId}/rating`, {
    method: update ? 'PUT' : 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getDriverRatingsSummary() {
  return apiRequest('/drivers/me/ratings/summary', { auth: true });
}

export function getDriverRatings({ limit = 20, offset = 0 } = {}) {
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiRequest(`/drivers/me/ratings?${qs}`, { auth: true });
}

export function getPublicDriverRatingSummary(driverId) {
  return apiRequest(`/drivers/${driverId}/ratings/summary`);
}
