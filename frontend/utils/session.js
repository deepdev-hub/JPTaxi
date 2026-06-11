const TOKEN_KEY = 'jpTaxiToken';
const ROLE_KEY = 'jpTaxiRole';
const USER_KEY = 'jpTaxiUser';
const EMAIL_KEY = 'jpTaxiUserEmail';
const SESSION_KEY = 'jpTaxiSession';
const ACCOUNT_TYPE_KEY = 'jpTaxiLoginAccountType';
const AUTH_CHANGE_EVENT = 'jpTaxiAuthChange';

function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function onAuthChange(listener) {
  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {'customer'|'driver'} role */
export function persistAuthSession({ token, role, user, email, session }) {
  if (!token) {
    throw new Error('token is required');
  }
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(EMAIL_KEY, email);
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
  notifyAuthChange();
}

export function getStoredSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLoginAccountType(accountType) {
  localStorage.setItem(ACCOUNT_TYPE_KEY, accountType);
}

export function getLoginAccountType() {
  const value = localStorage.getItem(ACCOUNT_TYPE_KEY);
  return value === 'driver' ? 'driver' : 'customer';
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(SESSION_KEY);
  notifyAuthChange();
}

/** Xóa role/email mock khi không còn JWT (login cũ chỉ set localStorage rồi nhảy /home). */
export function clearOrphanAuthMarkers() {
  if (getAuthToken()) {
    return;
  }
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(SESSION_KEY);
}

/** Khách hàng hoặc legacy role `user` */
export function isCustomerRole() {
  const role = getAuthRole();
  return role === 'customer' || role === 'user';
}

export function isDriverRole() {
  return getAuthRole() === 'driver';
}

export function authHeaders() {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
