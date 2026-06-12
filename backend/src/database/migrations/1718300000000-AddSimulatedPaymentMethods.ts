import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSimulatedPaymentMethods1718300000000
  implements MigrationInterface
{
  name = 'AddSimulatedPaymentMethods1718300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'CASH'
    `);
    await queryRunner.query(`
      ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'PAYPAY'
    `);
    await queryRunner.query(`
      ALTER TYPE payment_method_enum ADD VALUE IF NOT EXISTS 'APPLE_PAY'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE payment_transaction
      ALTER COLUMN payment_method TYPE VARCHAR(20)
    `);
    await queryRunner.query(`
      UPDATE payment_transaction
      SET payment_method = CASE
        WHEN payment_method = 'APPLE_PAY' THEN 'VISA'
        WHEN payment_method IN ('CASH', 'PAYPAY') THEN 'VNPAY'
        ELSE payment_method
      END
    `);
    await queryRunner.query(`
      DROP TYPE payment_method_enum
    `);
    await queryRunner.query(`
      CREATE TYPE payment_method_enum AS ENUM ('VISA', 'MASTER', 'JCB', 'VNPAY')
    `);
    await queryRunner.query(`
      ALTER TABLE payment_transaction
      ALTER COLUMN payment_method TYPE payment_method_enum
      USING payment_method::payment_method_enum
    `);
  }
}
