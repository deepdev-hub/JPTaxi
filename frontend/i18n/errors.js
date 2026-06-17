const supportedErrorCodes = new Set([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'INVALID_CREDENTIALS',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
  'DRIVER_APPROVAL_PENDING',
  'DRIVER_LOCATION_REQUIRED',
  'INVALID_INSURANCE_DATES',
]);

const genericMessageCodes = new Set([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'CONFLICT',
]);

export function translateApiError(error, t, fallback) {
  const code = supportedErrorCodes.has(error?.code) ? error.code : 'UNKNOWN';
  const translated = t(`errors.${code}`);
  const message = Array.isArray(error?.message)
    ? error.message.join(', ')
    : typeof error?.message === 'string'
      ? error.message.trim()
      : '';

  if (message && genericMessageCodes.has(code)) {
    return message;
  }

  // If we have a clear 4xx message from backend, show it instead of a generic unknown error.
  if (message && error?.status && error.status >= 400 && error.status < 500) {
    return message;
  }

  if (!translated.startsWith('errors.')) {
    return translated;
  }

  if (message) {
    return message;
  }

  return fallback || t('errors.UNKNOWN');
}
