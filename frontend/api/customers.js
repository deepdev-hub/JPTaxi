import { apiRequest } from './client.js';

/** GET /api/customers/:customerId/profile */
export function fetchCustomerProfile(customerId) {
  return apiRequest(`/customers/${customerId}/profile`, { auth: true });
}

/** PUT /api/customers/:customerId/profile */
export function updateCustomerProfile(customerId, payload) {
  return apiRequest(`/customers/${customerId}/profile`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });
}
