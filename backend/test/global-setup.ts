import { config } from 'dotenv';
import { join } from 'path';

export default async function globalSetup(): Promise<void> {
  config({ path: join(__dirname, '..', '.env') });
  config({ path: join(__dirname, '..', '.env.local'), override: true });

  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  const { seedDatabase } = await import('../src/database/seed');
  await seedDatabase();
}
