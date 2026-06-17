export type Environment = Record<string, unknown>;

import { resolveDatabaseUrl } from './database-url';

const requiredVariables = ['JWT_SECRET'] as const;

function firstDefined(config: Environment, names: string[]): unknown {
  return names.find((name) => config[name] != null) ? config[names.find((name) => config[name] != null)!] : undefined;
}

function requiredString(config: Environment, name: string): string {
  const value = String(config[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function stringValue(config: Environment, names: string[], fallback = ''): string {
  const value = firstDefined(config, names);
  return String(value ?? fallback).trim();
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

function parseSpringSizeToMb(rawValue: string, envName: string): number {
  const normalized = rawValue.trim().toUpperCase();
  const match = normalized.match(/^(\d+)(KB|MB|GB)$/);
  if (!match) {
    throw new Error(`${envName} must use a Spring size format such as 10MB`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const factor = unit === 'KB' ? 1 / 1024 : unit === 'MB' ? 1 : 1024;
  const value = amount * factor;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${envName} must resolve to at least 1MB`);
  }
  return value;
}

function parseSpringDurationToMs(rawValue: string, envName: string): number {
  const normalized = rawValue.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m)$/);
  if (!match) {
    throw new Error(`${envName} must use a Spring duration format such as 10s`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 'ms' ? 1 : unit === 's' ? 1000 : 60_000;
  return amount * multiplier;
}

export function validateEnvironment(config: Environment): Environment {
  for (const name of requiredVariables) {
    requiredString(config, name);
  }
  const databaseUrl = resolveDatabaseUrl(config);
  if (requiredString(config, 'JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const frontendUrl = String(config.FRONTEND_URL ?? 'http://localhost:5173');
  const springUploadMaxFileSize = stringValue(
    config,
    ['SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE'],
  );
  const springUploadMaxRequestSize = stringValue(
    config,
    ['SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE'],
  );
  const uploadMaxFileSizeMb = springUploadMaxFileSize
    ? parseSpringSizeToMb(
        springUploadMaxFileSize,
        'SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE',
      )
    : integerValue(config, 'UPLOAD_MAX_FILE_SIZE_MB', 10, 1);
  const uploadMaxRequestSizeMb = springUploadMaxRequestSize
    ? parseSpringSizeToMb(
        springUploadMaxRequestSize,
        'SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE',
      )
    : integerValue(config, 'UPLOAD_MAX_REQUEST_SIZE_MB', 40, 1);

  const hasSupabaseConfig = [
    'SUPABASE_STORAGE_ENDPOINT',
    'SUPABASE_STORAGE_REGION',
    'SUPABASE_STORAGE_ACCESS_KEY',
    'SUPABASE_STORAGE_SECRET_KEY',
    'SUPABASE_STORAGE_BUCKET',
    'SUPABASE_STORAGE_PUBLIC_URL',
  ].every((name) => stringValue(config, [name]).length > 0);
  const rawUploadMode = stringValue(config, ['UPLOAD_MODE']);
  const uploadMode = (rawUploadMode || (hasSupabaseConfig ? 'supabase_s3' : 'local')).toLowerCase();
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

  const hasResendConfig = stringValue(config, ['RESEND_API_KEY']).length > 0;
  const hasSmtpConfig = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
    .every((name) => stringValue(config, [name]).length > 0);
  const rawMailMode = stringValue(config, ['MAIL_MODE']);
  const mailMode = (rawMailMode || (hasResendConfig ? 'resend' : hasSmtpConfig ? 'smtp' : 'console')).toLowerCase();
  if (!['console', 'smtp', 'resend'].includes(mailMode)) {
    throw new Error('MAIL_MODE must be console, smtp, or resend');
  }
  if (mailMode === 'smtp') {
    ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].forEach((name) =>
      requiredString(config, name),
    );
  }
  if (mailMode === 'resend') {
    requiredString(config, 'RESEND_API_KEY');
    if (!stringValue(config, ['APP_MAIL_FROM', 'MAIL_FROM'])) {
      throw new Error('Missing required environment variable: APP_MAIL_FROM');
    }
  }

  const poolMax = integerValue(config, 'DB_POOL_MAX', 3, 1);
  const poolMin = integerValue(config, 'DB_POOL_MIN', 1, 0);
  if (poolMin > poolMax) {
    throw new Error('DB_POOL_MIN must be less than or equal to DB_POOL_MAX');
  }

  const resendConnectTimeoutMs = stringValue(config, ['RESEND_CONNECT_TIMEOUT'])
    ? parseSpringDurationToMs(
        stringValue(config, ['RESEND_CONNECT_TIMEOUT']),
        'RESEND_CONNECT_TIMEOUT',
      )
    : integerValue(config, 'RESEND_CONNECT_TIMEOUT_MS', 10_000, 1);
  const resendReadTimeoutMs = stringValue(config, ['RESEND_READ_TIMEOUT'])
    ? parseSpringDurationToMs(
        stringValue(config, ['RESEND_READ_TIMEOUT']),
        'RESEND_READ_TIMEOUT',
      )
    : integerValue(config, 'RESEND_READ_TIMEOUT_MS', 15_000, 1);

  return {
    ...config,
    PORT: port,
    DATABASE_URL: databaseUrl,
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
    UPLOAD_MAX_FILE_SIZE_MB: uploadMaxFileSizeMb,
    UPLOAD_MAX_REQUEST_SIZE_MB: uploadMaxRequestSizeMb,
    MAIL_MODE: mailMode,
    RESEND_API_URL: String(
      config.RESEND_API_URL ?? 'https://api.resend.com/emails',
    ),
    RESEND_CONNECT_TIMEOUT_MS: resendConnectTimeoutMs,
    RESEND_READ_TIMEOUT_MS: resendReadTimeoutMs,
    APP_MAIL_FROM: stringValue(config, ['APP_MAIL_FROM', 'MAIL_FROM']),
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
      8_000,
      1_000,
    ),
    DISPATCH_BATCH_SIZE: integerValue(
      config,
      'DISPATCH_BATCH_SIZE',
      5,
      1,
    ),
    DISPATCH_LOCATION_MAX_AGE_MINUTES: integerValue(
      config,
      'DISPATCH_LOCATION_MAX_AGE_MINUTES',
      30,
      1,
    ),
    DISPATCH_SEARCH_STALE_MINUTES: integerValue(
      config,
      'DISPATCH_SEARCH_STALE_MINUTES',
      2,
      1,
    ),
  };
}
