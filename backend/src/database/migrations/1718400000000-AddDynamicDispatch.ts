import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDynamicDispatch1718400000000 implements MigrationInterface {
  name = 'AddDynamicDispatch1718400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ride_request
        ADD COLUMN search_group_id UUID,
        ADD COLUMN search_started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN search_radius_km INT NOT NULL DEFAULT 2
    `);
    await queryRunner.query(`
      UPDATE ride_request
      SET search_group_id = gen_random_uuid()
      WHERE search_group_id IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE ride_request
        ALTER COLUMN search_group_id SET NOT NULL,
        ALTER COLUMN search_group_id SET DEFAULT gen_random_uuid()
    `);
    await queryRunner.query(`
      ALTER TABLE ride_request_dispatch
        ADD COLUMN expires_at TIMESTAMPTZ,
        ADD COLUMN radius_km INT
    `);
    await queryRunner.query(`
      CREATE TABLE ride_search_driver_exclusion (
        exclusion_id SERIAL PRIMARY KEY,
        search_group_id UUID NOT NULL,
        driver_id INT NOT NULL REFERENCES driver(driver_id) ON DELETE CASCADE,
        request_id INT REFERENCES ride_request(request_id) ON DELETE SET NULL,
        reason VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_search_group_driver UNIQUE (search_group_id, driver_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_dispatch_pending_expiry
      ON ride_request_dispatch(status, expires_at)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_ride_request_search
      ON ride_request(status, search_started_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_ride_request_search`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_dispatch_pending_expiry`);
    await queryRunner.query(`DROP TABLE IF EXISTS ride_search_driver_exclusion`);
    await queryRunner.query(`
      ALTER TABLE ride_request_dispatch
        DROP COLUMN IF EXISTS radius_km,
        DROP COLUMN IF EXISTS expires_at
    `);
    await queryRunner.query(`
      ALTER TABLE ride_request
        DROP COLUMN IF EXISTS search_radius_km,
        DROP COLUMN IF EXISTS search_started_at,
        DROP COLUMN IF EXISTS search_group_id
    `);
  }
}
