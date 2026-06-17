const { Client } = require('pg');
const { config } = require('dotenv');
const { URL } = require('url');
const { join } = require('path');
const { spawnSync } = require('child_process');

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.local'), override: true });

const command = process.argv[2];
const adminUrl = process.env.DATABASE_ADMIN_URL;

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

function resolveUrl(names) {
  const directUrl = firstDefined(names);
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

const resolvedAdminUrl = resolveUrl(['DATABASE_ADMIN_URL', 'DATABASE_URL']);
const appUrl = resolveUrl(['DATABASE_URL']);
const ssl =
  String(process.env.DB_SSL ?? 'false').toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : undefined;

if (!['create', 'reset'].includes(command)) {
  throw new Error('Usage: node scripts/db-admin.js <create|reset>');
}
if (!resolvedAdminUrl || !appUrl) {
  throw new Error('DATABASE_ADMIN_URL or DATABASE_URL is required');
}

const parsed = new URL(appUrl);
const database = decodeURIComponent(parsed.pathname.slice(1));
const username = decodeURIComponent(parsed.username);
const password = decodeURIComponent(parsed.password);

if (database !== 'JPTaxi') {
  throw new Error('Database administration is restricted to JPTaxi');
}
if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(username)) {
  throw new Error('Invalid application database username');
}
if (command === 'reset' && process.env.RESET_JPTAXI !== 'YES') {
  throw new Error('Set RESET_JPTAXI=YES to confirm dropping database JPTaxi');
}

const quoteIdentifier = (value) => `"${value.replace(/"/g, '""')}"`;
const quoteLiteral = (value) => `'${value.replace(/'/g, "''")}'`;

async function main() {
  const client = new Client({ connectionString: resolvedAdminUrl, ssl });
  await client.connect();
  try {
    const role = quoteIdentifier(username);
    if (command === 'reset') {
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [database],
      );
      await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
    }

    const roleExists = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [username],
    );
    if (roleExists.rowCount) {
      await client.query(`ALTER ROLE ${role} WITH LOGIN PASSWORD ${quoteLiteral(password)}`);
    } else {
      await client.query(`CREATE ROLE ${role} WITH LOGIN PASSWORD ${quoteLiteral(password)}`);
    }

    const databaseExists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (!databaseExists.rowCount) {
      await client.query(
        `CREATE DATABASE ${quoteIdentifier(database)} OWNER ${role} ENCODING 'UTF8'`,
      );
    }
  } finally {
    await client.end();
  }

  if (command === 'reset') {
    const npmCli = process.env.npm_execpath;
    if (!npmCli) {
      throw new Error('Run database reset through npm run db:reset');
    }
    for (const script of ['db:migrate', 'db:seed']) {
      const result = spawnSync(process.execPath, [npmCli, 'run', script], {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
      });
      if (result.error) throw result.error;
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
