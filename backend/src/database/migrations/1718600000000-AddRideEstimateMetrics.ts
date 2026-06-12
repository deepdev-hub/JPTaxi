import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRideEstimateMetrics1718600000000 implements MigrationInterface {
  name = 'AddRideEstimateMetrics1718600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ride_request
        ADD COLUMN estimated_distance_meters INTEGER,
        ADD COLUMN estimated_duration_seconds INTEGER
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ride_request
        DROP COLUMN estimated_duration_seconds,
        DROP COLUMN estimated_distance_meters
    `);
  }
}
