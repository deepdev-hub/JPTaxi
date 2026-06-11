const SESSION_KEY = 'jpTaxiSession';
const ACCOUNT_TYPE_KEY = 'jpTaxiLoginAccountType';
const AUTH_CHANGE_EVENT = 'jpTaxiAuthChange';

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function onAuthChange(listener) {
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
}

export function getAuthToken() {
  return readSession()?.token ?? null;
}

export function getAuthRole() {
  return readSession()?.role ?? null;
}

export function getStoredUser() {
  return readSession()?.user ?? null;
}

export function persistAuthSession({ token, role, user, email, session }) {
  if (!token) throw new Error('token is required');
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token,
      role,
      user: user ?? null,
      email: email ?? '',
      serverSession: session ?? null,
    }),
  );
  notifyAuthChange();
}

export function getStoredSession() {
  return readSession();
}

export function saveLoginAccountType(accountType) {
  localStorage.setItem(ACCOUNT_TYPE_KEY, accountType);
}

export function getLoginAccountType() {
  const value = localStorage.getItem(ACCOUNT_TYPE_KEY);
  return value === 'driver' ? 'driver' : 'customer';
}

export function clearAuthSession() {
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange();
}

export function clearOrphanAuthMarkers() {
  if (!getAuthToken()) localStorage.removeItem(SESSION_KEY);
}

export function isCustomerRole() {
  return getAuthRole() === 'customer';
}

export function isDriverRole() {
  return getAuthRole() === 'driver';
}

export function authHeaders() {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
