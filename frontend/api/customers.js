import { apiRequest } from './client.js';

export function fetchCustomerProfile() {
  return apiRequest('/customers/me/profile');
}

export function updateCustomerProfile(payload) {
  return apiRequest('/customers/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getSavedPlaces() {
  return apiRequest('/customers/me/saved-places');
}

export function savePlace(type, payload) {
  return apiRequest(`/customers/me/saved-places/${type}`, {
    method: 'PUT',
    body: JSON.stringify({ ...payload, type }),
  });
}

export function deleteSavedPlace(savedPlaceId) {
  return apiRequest(`/customers/me/saved-places/${savedPlaceId}`, {
    method: 'DELETE',
  });
}

export function getNotificationPreferences() {
  return apiRequest('/customers/me/notification-preferences');
}

export function updateNotificationPreferences(payload) {
  return apiRequest('/customers/me/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function getPaymentMethods() {
  return apiRequest('/customers/me/payment-methods');
}

export function getLoginHistory() {
  return apiRequest('/customers/me/login-history');
}

export function addPaymentMethod(payload) {
  return apiRequest('/customers/me/payment-methods', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePaymentMethod(paymentMethodId) {
  return apiRequest(`/customers/me/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
  });
}

export function getSearchHistory() {
  return apiRequest('/customers/me/search-history');
}

export function addSearchHistory(payload) {
  return apiRequest('/customers/me/search-history', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function clearSearchHistory() {
  return apiRequest('/customers/me/search-history', {
    method: 'DELETE',
  });
}
