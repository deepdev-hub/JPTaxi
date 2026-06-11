import { apiRequest, API_BASE } from './client.js';

const DEFAULT_CUSTOMER_ID = 1;
const DEFAULT_DRIVER_ID = 1;

function decodeJwtPayload(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function idFromRoleToken(role) {
  const token = role === 'driver'
    ? localStorage.getItem('jpTaxiDriverToken') || localStorage.getItem('jpTaxiToken')
    : localStorage.getItem('jpTaxiCustomerToken') || localStorage.getItem('jpTaxiToken');
  const payload = decodeJwtPayload(token);
  if (payload?.role && payload.role !== role) return null;
  return Number(payload?.id) || null;
}

function idFromEmail(prefix, fallback) {
  const activeRole = sessionStorage.getItem('jpTaxiActiveRole') || localStorage.getItem('jpTaxiRole');
  const roleEmail = activeRole === 'driver'
    ? localStorage.getItem('jpTaxiDriverEmail')
    : localStorage.getItem('jpTaxiCustomerEmail');
  const email = roleEmail || localStorage.getItem('jpTaxiUserEmail') || '';
  const match = email.match(new RegExp(`^${prefix}(\\d+)@`, 'i'));
  return match ? Number(match[1]) : fallback;
}

function getStoredDriverEmail() {
  return localStorage.getItem('jpTaxiDriverEmail') || localStorage.getItem('jpTaxiUserEmail') || '';
}

function hasExplicitDriverId() {
  return Boolean(
    idFromRoleToken('driver')
    || Number(localStorage.getItem('jpTaxiDriverId'))
    || getStoredDriverEmail().match(/^driver\d+@/i),
  );
}

export function getCurrentCustomerId() {
  return idFromRoleToken('customer') || Number(localStorage.getItem('jpTaxiCustomerId')) || idFromEmail('customer', DEFAULT_CUSTOMER_ID);
}

export function getCurrentDriverId() {
  return idFromRoleToken('driver') || Number(localStorage.getItem('jpTaxiDriverId')) || idFromEmail('driver', DEFAULT_DRIVER_ID);
}

export function getCustomerProfile(customerId = getCurrentCustomerId()) {
  return apiRequest(`/customers/${customerId}/profile`);
}

export function updateCustomerProfile(payload, customerId = getCurrentCustomerId()) {
  return apiRequest(`/customers/${customerId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getDriverProfile(driverId = getCurrentDriverId()) {
  const email = getStoredDriverEmail();
  if (email && !hasExplicitDriverId()) {
    try {
      const profile = await apiRequest(`/drivers/profile-by-email?email=${encodeURIComponent(email)}`);
      if (profile?.driverId) localStorage.setItem('jpTaxiDriverId', String(profile.driverId));
      return profile;
    } catch {
      // Fallback to the legacy demo profile route below.
    }
  }
  return apiRequest(`/drivers/${driverId}/profile`);
}

export function updateDriverProfile(payload, driverId = getCurrentDriverId()) {
  return apiRequest(`/drivers/${driverId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateDriverBankAccount(payload, driverId = getCurrentDriverId()) {
  return apiRequest(`/drivers/${driverId}/bank-account`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateDriverDocuments(payload, driverId = getCurrentDriverId()) {
  return apiRequest(`/drivers/${driverId}/documents`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function resolveAssetUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE.replace(/\/api$/, '')}${url}`;
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiRequest('/uploads/avatar', {
    method: 'POST',
    body: formData,
  });
  if (!result?.url) return null;
  return resolveAssetUrl(result.url);
}

export async function uploadDriverDocument(documentType, file) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await apiRequest(`/uploads/drivers/${documentType}`, {
    method: 'POST',
    body: formData,
  });
  return result?.url || null;
}
