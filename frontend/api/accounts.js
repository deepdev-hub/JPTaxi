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
  if (!url) return DEFAULT_AVATAR_URL;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) return url;
  
  const baseUrl = API_BASE.replace(/\/api\/?$/, '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const DEFAULT_AVATAR_URL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzljYTNhZiI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MxLjY2IDAgMyAxLjM0IDMgM3MtMS4zNCAzLTMgMy0zLTEuMzQtMy0zIDEuMzQtMyAzLTN6bTAgMTQuMmMtMi41IDAtNC43MS0xLjI4LTYtMy4yMi4wMy0xLjk5IDQtMy4wOCA2LTMuMDggMS45OSAwIDUuOTcgMS4wOSA2IDMuMDgtMS4yOSAxLjk0LTMuNSAzLjIyLTYgMy4yMnoiLz48L3N2Zz4=";

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
