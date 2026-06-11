import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum VehicleTypeEnum {
  Four = '4',
  Seven = '7',
  Nine = '9',
}

@Entity({ name: 'vehicle' })
export class Vehicle {
  @PrimaryGeneratedColumn({ name: 'vehicle_id' })
  vehicleId: number;

  @Column({ name: 'driver_id', unique: true })
  driverId: number;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleTypeEnum,
    enumName: 'vehicle_type_enum',
  })
  vehicleType: VehicleTypeEnum;

  @Column({ name: 'license_plate', type: 'varchar', length: 20, unique: true })
  licensePlate: string;

  @Column({ type: 'varchar', length: 50 })
  brand: string;

  @Column({ type: 'varchar', length: 30 })
  color: string;

  @Column({ name: 'manufacture_year', type: 'int' })
  manufactureYear: number;

  @Column({ name: 'vehicle_photo_url', type: 'varchar', length: 255, nullable: true })
  vehiclePhotoUrl: string | null;

  @Column({ name: 'registration_paper_url', type: 'varchar', length: 255, nullable: true })
  registrationPaperUrl: string | null;
}
