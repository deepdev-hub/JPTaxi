const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.JP_TAXI_API_BASE : '') ||
  'http://localhost:3000/api';

function getAuthHeaders() {
  const activeRole = sessionStorage.getItem('jpTaxiActiveRole') || localStorage.getItem('jpTaxiRole');
  const roleToken = activeRole === 'driver'
    ? localStorage.getItem('jpTaxiDriverToken')
    : localStorage.getItem('jpTaxiCustomerToken');
  const token = roleToken || localStorage.getItem('jpTaxiToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const errorBody = await response.json();
      message = errorBody.message || message;
    } catch {
      /* keep default message */
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

export { API_BASE };
