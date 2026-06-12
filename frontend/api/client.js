const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.JP_TAXI_API_BASE : '') ||
  'http://localhost:3000/api';

function getAuthHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  constructor(message, { code = 'UNKNOWN', status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const { responseType, ...fetchOptions } = options;
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    let code = 'UNKNOWN';
    try {
      const errorBody = await response.json();
      message = errorBody.message || message;
      code = errorBody.code || code;
    } catch {
      /* keep default message */
    }
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      { code, status: response.status },
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (responseType === 'blob') {
    return response.blob();
  }
  if (!contentType.includes('application/json')) {
    return response.text();
  }

  return response.json();
}

export { API_BASE };
import { getAuthToken } from '../utils/session.js';
