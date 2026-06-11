const { Client } = require('pg');
const { config } = require('dotenv');
const { join } = require('path');

config({ path: join(__dirname, '..', '.env') });
config({ path: join(__dirname, '..', '.env.local'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
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
