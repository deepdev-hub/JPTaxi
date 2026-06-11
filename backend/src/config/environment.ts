export type Environment = Record<string, unknown>;

const requiredVariables = ['DATABASE_URL', 'JWT_SECRET'] as const;

function requiredString(config: Environment, name: string): string {
  const value = String(config[name] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnvironment(config: Environment): Environment {
  for (const name of requiredVariables) {
    requiredString(config, name);
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    ...config,
    PORT: port,
    DATABASE_URL: requiredString(config, 'DATABASE_URL'),
    JWT_SECRET: requiredString(config, 'JWT_SECRET'),
    FRONTEND_URL: String(config.FRONTEND_URL ?? 'http://localhost:5173'),
    MAIL_MODE: String(config.MAIL_MODE ?? 'console'),
    NOMINATIM_BASE_URL: String(
      config.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org',
    ),
    OSRM_BASE_URL: String(
      config.OSRM_BASE_URL ?? 'https://router.project-osrm.org',
    ),
  };
}
