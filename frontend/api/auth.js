import { apiRequest } from './client.js';

export function registerAccount(payload) {
  return apiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
