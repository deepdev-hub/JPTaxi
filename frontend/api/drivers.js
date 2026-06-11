import { apiRequest } from './client.js';

export function searchDrivers(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      query.set(key, String(value));
    }
  });
  return apiRequest(`/drivers/search?${query.toString()}`);
}

export function getDriverProfile(driverId) {
  return apiRequest(`/drivers/${driverId}/profile`);
}

/** GET /api/drivers/me/profile — tài xế (JWT) */
export function getDriverMyProfile() {
  return apiRequest('/drivers/me/profile', { auth: true });
}

export function updateDriverProfile(payload) {
  return apiRequest('/drivers/me/profile', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateBankAccount(payload) {
  return apiRequest('/drivers/me/bank-account', {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateDriverDocuments(payload) {
  return apiRequest('/drivers/me/documents', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function setDriverAvailability(isOnline) {
  return apiRequest('/drivers/me/availability', {
    method: 'PUT',
    body: JSON.stringify({ isOnline }),
  });
}

export function getDriverPayouts() {
  return apiRequest('/drivers/me/payouts');
}
