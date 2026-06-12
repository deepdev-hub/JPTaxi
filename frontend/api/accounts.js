import { API_BASE, apiRequest } from './client.js';
import { getAuthToken } from '../utils/session.js';

function currentJwtPayload() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

export function getCurrentCustomerId() {
  const payload = currentJwtPayload();
  return payload?.role === 'customer' ? Number(payload.id) : null;
}

export function getCurrentDriverId() {
  const payload = currentJwtPayload();
  return payload?.role === 'driver' ? Number(payload.id) : null;
}

export function getCustomerProfile() {
  return apiRequest('/customers/me/profile');
}

export function updateCustomerProfile(payload) {
  return apiRequest('/customers/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getDriverProfile() {
  return apiRequest('/drivers/me/profile');
}

export function updateDriverProfile(payload) {
  return apiRequest('/drivers/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateDriverBankAccount(payload) {
  return apiRequest('/drivers/me/bank-account', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function updateDriverDocuments(payload) {
  return apiRequest('/drivers/me/documents', {
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
  return result?.url || null;
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
