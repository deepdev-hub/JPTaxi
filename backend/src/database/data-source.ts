import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { resolveDatabaseUrl } from '../config/database-url';

loadEnv({ path: join(__dirname, '..', '..', '.env') });
loadEnv({ path: join(__dirname, '..', '..', '.env.local'), override: true });

const databaseUrl = resolveDatabaseUrl(process.env);

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '..', 'entities', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  extra: {
    max: Number(process.env.DB_POOL_MAX ?? 3),
    min: Number(process.env.DB_POOL_MIN ?? 1),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 30_000),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 600_000),
    maxLifetimeSeconds: Math.ceil(
      Number(process.env.DB_MAX_LIFETIME_MS ?? 1_800_000) / 1000,
    ),
  },
});
