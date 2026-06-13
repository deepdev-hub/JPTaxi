import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCustomerSavedPlaceCoordinatesNullable1719100000000
  implements MigrationInterface
{
  name = 'MakeCustomerSavedPlaceCoordinatesNullable1719100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_saved_place
      ALTER COLUMN latitude DROP NOT NULL,
      ALTER COLUMN longitude DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE customer_saved_place
      SET latitude = COALESCE(latitude, 0),
          longitude = COALESCE(longitude, 0)
      WHERE latitude IS NULL OR longitude IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE customer_saved_place
      ALTER COLUMN latitude SET NOT NULL,
      ALTER COLUMN longitude SET NOT NULL
    `);
  }
}
