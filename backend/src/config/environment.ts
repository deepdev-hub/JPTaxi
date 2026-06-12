export type Environment = Record<string, unknown>;

const requiredVariables = ['DATABASE_URL', 'JWT_SECRET'] as const;

function requiredString(config: Environment, name: string): string {
  const value = String(config[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function integerValue(
  config: Environment,
  name: string,
  fallback: number,
  minimum: number,
): number {
  const value = Number(config[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

function booleanValue(config: Environment, name: string, fallback = false): boolean {
  const value = String(config[name] ?? fallback).toLowerCase();
  if (!['true', 'false'].includes(value)) {
    throw new Error(`${name} must be true or false`);
  }
  return value === 'true';
}

export function validateEnvironment(config: Environment): Environment {
  for (const name of requiredVariables) {
    requiredString(config, name);
  }
  if (requiredString(config, 'JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const frontendUrl = String(config.FRONTEND_URL ?? 'http://localhost:5173');
  const mailMode = String(config.MAIL_MODE ?? 'console').toLowerCase();
  if (!['console', 'smtp', 'resend'].includes(mailMode)) {
    throw new Error('MAIL_MODE must be console, smtp, or resend');
  }
  if (mailMode === 'smtp') {
    ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].forEach((name) =>
      requiredString(config, name),
    );
  }
  if (mailMode === 'resend') {
    ['RESEND_API_KEY', 'MAIL_FROM'].forEach((name) =>
      requiredString(config, name),
    );
  }

  const uploadMode = String(config.UPLOAD_MODE ?? 'local').toLowerCase();
  if (!['local', 'supabase_s3'].includes(uploadMode)) {
    throw new Error('UPLOAD_MODE must be local or supabase_s3');
  }
  if (uploadMode === 'supabase_s3') {
    [
      'SUPABASE_STORAGE_ENDPOINT',
      'SUPABASE_STORAGE_REGION',
      'SUPABASE_STORAGE_ACCESS_KEY',
      'SUPABASE_STORAGE_SECRET_KEY',
      'SUPABASE_STORAGE_BUCKET',
      'SUPABASE_STORAGE_PUBLIC_URL',
    ].forEach((name) => requiredString(config, name));
  }

  const poolMax = integerValue(config, 'DB_POOL_MAX', 3, 1);
  const poolMin = integerValue(config, 'DB_POOL_MIN', 1, 0);
  if (poolMin > poolMax) {
    throw new Error('DB_POOL_MIN must be less than or equal to DB_POOL_MAX');
  }

  return {
    ...config,
    PORT: port,
    DATABASE_URL: requiredString(config, 'DATABASE_URL'),
    JWT_SECRET: requiredString(config, 'JWT_SECRET'),
    DB_SSL: booleanValue(config, 'DB_SSL'),
    DB_POOL_MAX: poolMax,
    DB_POOL_MIN: poolMin,
    DB_CONNECTION_TIMEOUT_MS: integerValue(
      config,
      'DB_CONNECTION_TIMEOUT_MS',
      30_000,
      1,
    ),
    DB_IDLE_TIMEOUT_MS: integerValue(
      config,
      'DB_IDLE_TIMEOUT_MS',
      600_000,
      1,
    ),
    DB_MAX_LIFETIME_MS: integerValue(
      config,
      'DB_MAX_LIFETIME_MS',
      1_800_000,
      1,
    ),
    FRONTEND_URL: frontendUrl,
    RESET_PASSWORD_URL: String(
      config.RESET_PASSWORD_URL ?? `${frontendUrl}/reset-password`,
    ),
    PASSWORD_RESET_EXPIRATION_MINUTES: integerValue(
      config,
      'PASSWORD_RESET_EXPIRATION_MINUTES',
      30,
      1,
    ),
    AUTO_APPROVE_DRIVERS: booleanValue(
      config,
      'AUTO_APPROVE_DRIVERS',
      false,
    ),
    CORS_ALLOWED_ORIGINS: String(config.CORS_ALLOWED_ORIGINS ?? frontendUrl),
    UPLOAD_MODE: uploadMode,
    UPLOAD_MAX_FILE_SIZE_MB: integerValue(
      config,
      'UPLOAD_MAX_FILE_SIZE_MB',
      10,
      1,
    ),
    UPLOAD_MAX_REQUEST_SIZE_MB: integerValue(
      config,
      'UPLOAD_MAX_REQUEST_SIZE_MB',
      40,
      1,
    ),
    MAIL_MODE: mailMode,
    RESEND_API_URL: String(
      config.RESEND_API_URL ?? 'https://api.resend.com/emails',
    ),
    RESEND_CONNECT_TIMEOUT_MS: integerValue(
      config,
      'RESEND_CONNECT_TIMEOUT_MS',
      10_000,
      1,
    ),
    RESEND_READ_TIMEOUT_MS: integerValue(
      config,
      'RESEND_READ_TIMEOUT_MS',
      15_000,
      1,
    ),
    NOMINATIM_BASE_URL: String(
      config.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
    ),
    OSRM_BASE_URL: String(
      config.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
    ),
    DISPATCH_SCHEDULER_ENABLED: booleanValue(
      config,
      'DISPATCH_SCHEDULER_ENABLED',
      true,
    ),
    DISPATCH_INITIAL_RADIUS_KM: integerValue(
      config,
      'DISPATCH_INITIAL_RADIUS_KM',
      2,
      1,
    ),
    DISPATCH_RADIUS_STEP_KM: integerValue(
      config,
      'DISPATCH_RADIUS_STEP_KM',
      1,
      1,
    ),
    DISPATCH_EXPANSION_INTERVAL_MS: integerValue(
      config,
      'DISPATCH_EXPANSION_INTERVAL_MS',
      2_000,
      100,
    ),
    DISPATCH_OFFER_TIMEOUT_MS: integerValue(
      config,
      'DISPATCH_OFFER_TIMEOUT_MS',
      30_000,
      1_000,
    ),
    DISPATCH_LOCATION_MAX_AGE_MINUTES: integerValue(
      config,
      'DISPATCH_LOCATION_MAX_AGE_MINUTES',
      30,
      1,
    ),
  };
}
