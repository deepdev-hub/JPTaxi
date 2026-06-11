import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RideRequest } from './ride-request.entity';

export enum TripStatusType {
  ongoing = 'ongoing',
  completed = 'completed',
  cancelled_by_admin = 'cancelled_by_admin',
}

@Entity({ name: 'trip' })
export class Trip {
  @PrimaryGeneratedColumn({ name: 'trip_id' })
  tripId: number;

  @OneToOne(() => RideRequest)
  @JoinColumn({ name: 'request_id' })
  rideRequest: RideRequest;

  @Column({ name: 'driver_id' })
  driverId: number;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date | null;

  @Column({ name: 'payment_requested_at', type: 'timestamptz', nullable: true })
  paymentRequestedAt: Date | null;

  @Column({ name: 'actual_distance_km', type: 'decimal', precision: 8, scale: 2 })
  actualDistanceKm: string;

  @Column({ name: 'exchange_rate_vnd_to_jpy', type: 'decimal', precision: 10, scale: 4 })
  exchangeRateVndToJpy: string;

  @Column({ name: 'final_fare_vnd', type: 'int' })
  finalFareVnd: number;

  @Column({ name: 'final_fare_jpy', type: 'int' })
  finalFareJpy: number;

  @Column({ name: 'raw_fare_vnd', type: 'int', nullable: true })
  rawFareVnd: number | null;

  @Column({
    type: 'enum',
    enum: TripStatusType,
    enumName: 'trip_status_type',
  })
  status: TripStatusType;
}
