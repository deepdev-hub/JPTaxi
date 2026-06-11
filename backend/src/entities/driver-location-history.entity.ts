import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'driver_location_history' })
export class DriverLocationHistory {
  @PrimaryGeneratedColumn({ name: 'location_id' })
  locationId: number;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude: string;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude: string;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  recordedAt: Date;
}
