import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLoginUserAgent1718200000000 implements MigrationInterface {
  name = 'AddLoginUserAgent1718200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE login_history
      ADD COLUMN user_agent VARCHAR(512)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE login_history
      DROP COLUMN user_agent
    `);
  }
}
