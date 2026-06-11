const { Client } = require('pg');
const { config } = require('dotenv');
const { URL } = require('url');
const { join } = require('path');
const { spawnSync } = require('child_process');

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.local'), override: true });

const command = process.argv[2];
const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = process.env.DATABASE_URL;

if (!['create', 'reset'].includes(command)) {
  throw new Error('Usage: node scripts/db-admin.js <create|reset>');
}
if (!adminUrl || !appUrl) {
  throw new Error('DATABASE_ADMIN_URL and DATABASE_URL are required');
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
  const client = new Client({ connectionString: adminUrl });
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
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    for (const script of ['db:migrate', 'db:seed']) {
      const result = spawnSync(npm, ['run', script], {
        cwd: join(__dirname, '..'),
        env: process.env,
        stdio: 'inherit',
      });
      if (result.status !== 0) process.exit(result.status || 1);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
