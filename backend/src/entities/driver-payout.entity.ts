import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PayoutStatusType {
  pending = 'pending',
  processed = 'processed',
  failed = 'failed',
}

@Entity({ name: 'driver_payout' })
export class DriverPayout {
  @PrimaryGeneratedColumn({ name: 'payout_id' })
  payoutId: number;

  @Column({ name: 'trip_id', type: 'int', unique: true })
  tripId: number;

  @Column({ name: 'driver_id', type: 'int' })
  driverId: number;

  @Column({ name: 'amount_vnd', type: 'int' })
  amountVnd: number;

  @Column({
    type: 'enum',
    enum: PayoutStatusType,
    enumName: 'payout_status_type',
  })
  status: PayoutStatusType;

  @Column({ name: 'bank_account_id', type: 'int', nullable: true })
  bankAccountId: number | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date | null;
}
