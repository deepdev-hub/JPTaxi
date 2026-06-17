import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('rejects startup when required secrets are missing', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow(
      'JWT_SECRET',
    );
  });

  it('provides local-first database, upload, mail and reset defaults', () => {
    const result = validateEnvironment({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/JPTaxi',
      JWT_SECRET: 'a-local-secret-with-at-least-32-characters',
    });

    expect(result).toMatchObject({
      AUTO_APPROVE_DRIVERS: false,
      DB_SSL: false,
      DB_POOL_MAX: 3,
      DB_POOL_MIN: 1,
      FRONTEND_URL: 'http://localhost:5173',
      RESET_PASSWORD_URL: 'http://localhost:5173/reset-password',
      PASSWORD_RESET_EXPIRATION_MINUTES: 30,
      UPLOAD_MODE: 'local',
      UPLOAD_MAX_FILE_SIZE_MB: 10,
      UPLOAD_MAX_REQUEST_SIZE_MB: 40,
      MAIL_MODE: 'console',
    });
  });

  it('requires provider credentials only when an external adapter is enabled', () => {
    const base = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/JPTaxi',
      JWT_SECRET: 'a-local-secret-with-at-least-32-characters',
    };

    expect(() => validateEnvironment({ ...base, MAIL_MODE: 'smtp' }))
      .toThrow('SMTP_HOST');
    expect(() => validateEnvironment({ ...base, MAIL_MODE: 'resend' }))
      .toThrow('RESEND_API_KEY');
    expect(() =>
      validateEnvironment({ ...base, UPLOAD_MODE: 'supabase_s3' }),
    ).toThrow('SUPABASE_STORAGE_ENDPOINT');
  });

  it('rejects weak JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/JPTaxi',
        JWT_SECRET: 'too-short',
      }),
    ).toThrow('JWT_SECRET');
  });

  it('provides the dynamic dispatch timing defaults', () => {
    const result = validateEnvironment({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/JPTaxi',
      JWT_SECRET: 'a-local-secret-with-at-least-32-characters',
    });

    expect(result).toMatchObject({
      DISPATCH_SCHEDULER_ENABLED: true,
      DISPATCH_INITIAL_RADIUS_KM: 2,
      DISPATCH_RADIUS_STEP_KM: 1,
      DISPATCH_EXPANSION_INTERVAL_MS: 2_000,
      DISPATCH_OFFER_TIMEOUT_MS: 8_000,
      DISPATCH_BATCH_SIZE: 5,
      DISPATCH_LOCATION_MAX_AGE_MINUTES: 30,
      DISPATCH_SEARCH_STALE_MINUTES: 2,
    });
  });

  it('builds DATABASE_URL from Spring datasource variables when password is externalized', () => {
    const result = validateEnvironment({
      SPRING_DATASOURCE_URL:
        'jdbc:postgresql://db.ficzkrauwiowwkpnirwo.supabase.co:5432/postgres?sslmode=require',
      SPRING_DATASOURCE_USERNAME: 'postgres',
      SPRING_DATASOURCE_PASSWORD: 'super-secret-password',
      JWT_SECRET: 'a-local-secret-with-at-least-32-characters',
      DB_SSL: 'true',
    });

    expect(result.DATABASE_URL).toBe(
      'postgresql://postgres:super-secret-password@db.ficzkrauwiowwkpnirwo.supabase.co:5432/postgres?sslmode=require',
    );
    expect(result.DB_SSL).toBe(true);
  });

  it('injects the externalized password into DATABASE_URL when the URL omits credentials', () => {
    const result = validateEnvironment({
      DATABASE_URL:
        'postgresql://postgres@db.ficzkrauwiowwkpnirwo.supabase.co:5432/postgres',
      SPRING_DATASOURCE_PASSWORD: 'super-secret-password',
      JWT_SECRET: 'a-local-secret-with-at-least-32-characters',
    });

    expect(result.DATABASE_URL).toBe(
      'postgresql://postgres:super-secret-password@db.ficzkrauwiowwkpnirwo.supabase.co:5432/postgres',
    );
  });
});
