import { describe, expect, it } from 'vitest';
import { translateApiError } from './errors.js';

describe('translateApiError', () => {
  it('translates invalid login credentials without calling the session expired message', () => {
    const t = (key) => ({
      'errors.INVALID_CREDENTIALS': 'Email, mật khẩu hoặc loại tài khoản không đúng.',
      'errors.UNAUTHORIZED': 'Phiên đăng nhập đã hết hạn.',
      'errors.UNKNOWN': 'Đã xảy ra lỗi.',
    })[key] || key;

    expect(translateApiError(
      { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      t,
    )).toBe('Email, mật khẩu hoặc loại tài khoản không đúng.');
  });

  it('translates a standardized API error code instead of leaking the backend message', () => {
    const t = (key) => ({
      'errors.UNAUTHORIZED': 'Phiên đăng nhập đã hết hạn.',
      'errors.UNKNOWN': 'Đã xảy ra lỗi.',
    })[key] || key;

    expect(translateApiError(
      { code: 'UNAUTHORIZED', message: 'Unauthorized' },
      t,
    )).toBe('Phiên đăng nhập đã hết hạn.');
  });
});
