import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleTypeEnum } from './vehicle.entity';

export enum RideRequestStatusType {
  pending = 'pending',
  searching = 'searching',
  assigned = 'assigned',
  completed = 'completed',
  failed = 'failed',
}

@Entity({ name: 'ride_request' })
export class RideRequest {
  @PrimaryGeneratedColumn({ name: 'request_id' })
  requestId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'pickup_address', type: 'varchar', length: 255 })
  pickupAddress: string;

  @Column({ name: 'pickup_lat', type: 'decimal', precision: 10, scale: 8 })
  pickupLat: string;

  @Column({ name: 'pickup_lng', type: 'decimal', precision: 11, scale: 8 })
  pickupLng: string;

  @Column({ name: 'dropoff_address', type: 'varchar', length: 255 })
  dropoffAddress: string;

  @Column({ name: 'dropoff_lat', type: 'decimal', precision: 10, scale: 8 })
  dropoffLat: string;

  @Column({ name: 'dropoff_lng', type: 'decimal', precision: 11, scale: 8 })
  dropoffLng: string;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: VehicleTypeEnum,
    enumName: 'vehicle_type_enum',
  })
  vehicleType: VehicleTypeEnum;

  @Column({ name: 'actual_passenger_name', type: 'varchar', length: 50, nullable: true })
  actualPassengerName: string | null;

  @Column({ name: 'actual_passenger_phone', type: 'varchar', length: 15, nullable: true })
  actualPassengerPhone: string | null;

  @Column({ name: 'request_time', type: 'timestamptz' })
  requestTime: Date;

  @Column({
    type: 'enum',
    enum: RideRequestStatusType,
    enumName: 'ride_request_status_type',
  })
  status: RideRequestStatusType;

  @Column({ name: 'note_to_driver', type: 'varchar', length: 255, nullable: true })
  noteToDriver: string | null;

  @Column({ name: 'estimated_fare_vnd', type: 'int', nullable: true })
  estimatedFareVnd: number | null;

  @Column({ name: 'estimated_fare_jpy', type: 'int', nullable: true })
  estimatedFareJpy: number | null;

  @Column({ name: 'raw_fare_vnd', type: 'int', nullable: true })
  rawFareVnd: number | null;

  @Column({ name: 'estimated_distance_meters', type: 'int', nullable: true })
  estimatedDistanceMeters: number | null;

  @Column({ name: 'estimated_duration_seconds', type: 'int', nullable: true })
  estimatedDurationSeconds: number | null;

  @Column({
    name: 'search_group_id',
    type: 'uuid',
    default: () => 'gen_random_uuid()',
  })
  searchGroupId: string;

  @Column({
    name: 'search_started_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  searchStartedAt: Date;

  @Column({ name: 'search_radius_km', type: 'int', default: 2 })
  searchRadiusKm: number;
}
