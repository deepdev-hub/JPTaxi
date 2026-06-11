import { getCustomerProfile, getDriverProfile } from '../api/auth.js';
import {
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  isCustomerRole,
  isDriverRole,
} from './session.js';

/** @returns {'customer'|'driver'|null} */
export async function verifyAuthSession() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const role = getAuthRole();
  try {
    if (role === 'driver' || isDriverRole()) {
      await getDriverProfile();
      return 'driver';
    }
    if (isCustomerRole()) {
      await getCustomerProfile();
      return 'customer';
    }
    clearAuthSession();
    return null;
  } catch {
    clearAuthSession();
    return null;
  }
}
