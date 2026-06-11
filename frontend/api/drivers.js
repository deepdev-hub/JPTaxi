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

export function updateDriverProfile(driverId, payload) {
  return apiRequest(`/drivers/${driverId}/profile`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function updateBankAccount(driverId, payload) {
  return apiRequest(`/drivers/${driverId}/bank-account`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}
