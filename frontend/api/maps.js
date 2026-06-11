import { apiRequest } from './client.js';

export function geocodePlaces(query, options = {}) {
  return apiRequest(`/map/geocode?q=${encodeURIComponent(query)}`, options);
}

export function reverseGeocode(latitude, longitude, options = {}) {
  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
  });
  return apiRequest(`/map/reverse?${query}`, options);
}

export function getDrivingRoute(start, end, options = {}) {
  return apiRequest('/map/route', {
    ...options,
    method: 'POST',
    body: JSON.stringify({
      startLat: Number(start[0]),
      startLng: Number(start[1]),
      endLat: Number(end[0]),
      endLng: Number(end[1]),
    }),
  });
}
