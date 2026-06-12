import { describe, expect, it } from 'vitest';
import { translateApiError } from './errors.js';

describe('translateApiError', () => {
  it('translates invalid login credentials without using the session expired message', () => {
    const t = (key) => ({
      'errors.INVALID_CREDENTIALS': 'Email, password, or account type is incorrect.',
      'errors.UNAUTHORIZED': 'Your session has expired.',
      'errors.UNKNOWN': 'Something went wrong.',
    })[key] || key;

    expect(
      translateApiError(
        { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        t,
      ),
    ).toBe('Email, password, or account type is incorrect.');
  });

  it('translates a standardized API error code instead of leaking the backend message', () => {
    const t = (key) => ({
      'errors.UNAUTHORIZED': 'Your session has expired.',
      'errors.UNKNOWN': 'Something went wrong.',
    })[key] || key;

    expect(
      translateApiError({ code: 'UNAUTHORIZED', message: 'Unauthorized' }, t),
    ).toBe('Your session has expired.');
  });

  it('returns the backend message for non-server errors without a localized code', () => {
    const t = (key) => ({
      'errors.UNKNOWN': 'Something went wrong.',
    })[key] || key;

    expect(
      translateApiError(
        {
          code: 'BAD_REQUEST',
          status: 400,
          message: 'Email is already registered.',
        },
        t,
      ),
    ).toBe('Email is already registered.');
  });
});
