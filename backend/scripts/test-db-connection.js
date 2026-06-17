const { Client } = require('pg');
const { config } = require('dotenv');
const { join } = require('path');

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.local'), override: true });

function firstDefined(names) {
  for (const name of names) {
    const value = String(process.env[name] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function injectCredentials(url, defaultUsername = '') {
  const username =
    url.username ||
    firstDefined(['SPRING_DATASOURCE_USERNAME', 'DB_USERNAME']) ||
    defaultUsername;
  const password =
    url.password || firstDefined(['SPRING_DATASOURCE_PASSWORD', 'DB_PASSWORD']);

  if (!username) {
    throw new Error('SPRING_DATASOURCE_USERNAME is required');
  }
  if (!password) {
    throw new Error('SPRING_DATASOURCE_PASSWORD is required');
  }

  url.username = username;
  url.password = password;
  return url.toString();
}

function resolveDatabaseUrl() {
  const directUrl = firstDefined(['DATABASE_URL']);
  if (directUrl) {
    return injectCredentials(new URL(directUrl), new URL(directUrl).username);
  }

  const jdbcUrl = firstDefined(['SPRING_DATASOURCE_URL']);
  if (!jdbcUrl) {
    throw new Error(
      'DATABASE_URL or SPRING_DATASOURCE_URL is required',
    );
  }

  const normalized = jdbcUrl.replace(/^jdbc:/, '');
  if (!normalized.startsWith('postgresql://')) {
    throw new Error('SPRING_DATASOURCE_URL must start with jdbc:postgresql://');
  }

  return injectCredentials(new URL(normalized));
}

const databaseUrl = resolveDatabaseUrl();
const ssl =
  String(process.env.DB_SSL ?? 'false').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : undefined;

async function main() {
  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();
  try {
    const result = await client.query(
      'SELECT current_database() AS database, current_user AS "user", NOW() AS server_time',
    );
    console.log(result.rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
