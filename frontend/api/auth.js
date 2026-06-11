import { apiRequest } from './client.js';

export function registerAccount(payload) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginAccount(payload) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCurrentAccount() {
  return apiRequest('/auth/me');
}

export function forgotPassword(email) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(payload) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function changePassword(payload) {
  return apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
