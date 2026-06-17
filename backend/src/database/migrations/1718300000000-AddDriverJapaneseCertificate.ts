import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverJapaneseCertificate1718300000000
  implements MigrationInterface
{
  name = 'AddDriverJapaneseCertificate1718300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE driver
      ADD COLUMN japanese_certificate_url VARCHAR(255)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE driver
      DROP COLUMN japanese_certificate_url
    `);
  }
}
