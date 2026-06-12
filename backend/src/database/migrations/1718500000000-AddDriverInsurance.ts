import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDriverInsurance1718500000000 implements MigrationInterface {
  name = 'AddDriverInsurance1718500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE driver_insurance (
        insurance_id SERIAL PRIMARY KEY,
        driver_id INT NOT NULL UNIQUE REFERENCES driver(driver_id) ON DELETE CASCADE,
        provider_name VARCHAR(120) NOT NULL,
        policy_number VARCHAR(80) NOT NULL,
        effective_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        document_url VARCHAR(255) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_driver_insurance_dates CHECK (expiry_date >= effective_date)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS driver_insurance');
  }
}
