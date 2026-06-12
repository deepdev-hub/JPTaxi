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

export function translateApiError(error, t, fallback) {
  const code = supportedErrorCodes.has(error?.code) ? error.code : 'UNKNOWN';
  const translated = t(`errors.${code}`);
  return translated.startsWith('errors.')
    ? fallback || t('errors.UNKNOWN')
    : translated;
}
