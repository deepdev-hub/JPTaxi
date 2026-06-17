import type { Environment } from './environment';

function firstDefined(config: Environment, names: string[]): string {
  for (const name of names) {
    const value = String(config[name] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function parseJdbcPostgresUrl(jdbcUrl: string): URL {
  const normalized = jdbcUrl.replace(/^jdbc:/, '');
  if (!normalized.startsWith('postgresql://')) {
    throw new Error('SPRING_DATASOURCE_URL must start with jdbc:postgresql://');
  }
  return new URL(normalized);
}

function injectCredentials(
  url: URL,
  config: Environment,
  defaultUsername = '',
): string {
  const username = url.username || firstDefined(config, [
    'SPRING_DATASOURCE_USERNAME',
    'DB_USERNAME',
  ]) || defaultUsername;
  const password = url.password || firstDefined(config, [
    'SPRING_DATASOURCE_PASSWORD',
    'DB_PASSWORD',
  ]);

  if (!username) {
    throw new Error(
      'Missing required environment variable: SPRING_DATASOURCE_USERNAME',
    );
  }
  if (!password) {
    throw new Error(
      'Missing required environment variable: SPRING_DATASOURCE_PASSWORD',
    );
  }

  url.username = username;
  url.password = password;
  return url.toString();
}

export function resolveDatabaseUrl(config: Environment): string {
  const directUrl = firstDefined(config, ['DATABASE_URL']);
  if (directUrl) {
    const parsed = new URL(directUrl);
    return injectCredentials(parsed, config, parsed.username);
  }

  const jdbcUrl = firstDefined(config, ['SPRING_DATASOURCE_URL']);
  if (!jdbcUrl) {
    throw new Error(
      'Missing required environment variable: DATABASE_URL or SPRING_DATASOURCE_URL',
    );
  }

  const url = parseJdbcPostgresUrl(jdbcUrl);
  return injectCredentials(url, config);
}
