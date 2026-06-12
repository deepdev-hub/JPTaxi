import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearAuthSession,
  getAuthRole,
  getAuthToken,
  getStoredUser,
  persistAuthSession,
} from './session.js';

describe('authentication session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores one token and user identity in jpTaxiSession', () => {
    const listener = vi.fn();
    window.addEventListener('jpTaxiAuthChange', listener);

    persistAuthSession({
      token: 'jwt-token',
      role: 'driver',
      user: { id: 12, email: 'driver@example.com' },
      email: 'driver@example.com',
    });

    expect(getAuthToken()).toBe('jwt-token');
    expect(getAuthRole()).toBe('driver');
    expect(getStoredUser()).toEqual({
      id: 12,
      email: 'driver@example.com',
    });
    expect(localStorage.getItem('customerToken')).toBeNull();
    expect(localStorage.getItem('driverToken')).toBeNull();
    expect(localStorage.getItem('userId')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(1);

    clearAuthSession();
    expect(getAuthToken()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener('jpTaxiAuthChange', listener);
  });
});
