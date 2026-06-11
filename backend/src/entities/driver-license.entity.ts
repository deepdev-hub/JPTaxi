import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LicenseTypeEnum {
  B = 'B',
  C1 = 'C1',
  C = 'C',
  D1 = 'D1',
  D2 = 'D2',
  D = 'D',
}

@Entity({ name: 'driver_license' })
export class DriverLicense {
  @PrimaryGeneratedColumn({ name: 'license_id' })
  licenseId: number;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({
    name: 'license_type',
    type: 'enum',
    enum: LicenseTypeEnum,
    enumName: 'license_type_enum',
  })
  licenseType: LicenseTypeEnum;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'issue_place', type: 'varchar', length: 100, nullable: true })
  issuePlace: string | null;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Column({ name: 'front_image_url', type: 'varchar', length: 255, nullable: true })
  frontImageUrl: string | null;

  @Column({ name: 'back_image_url', type: 'varchar', length: 255, nullable: true })
  backImageUrl: string | null;
}
