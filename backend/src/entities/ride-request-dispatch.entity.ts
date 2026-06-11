import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum DispatchStatusType {
  pending = 'pending',
  accepted = 'accepted',
  rejected = 'rejected',
  timeout = 'timeout',
}

@Entity({ name: 'ride_request_dispatch' })
export class RideRequestDispatch {
  @PrimaryGeneratedColumn({ name: 'dispatch_id' })
  dispatchId: number;

  @Column({ name: 'request_id', type: 'int' })
  requestId: number;

  @Column({ name: 'driver_id', type: 'int' })
  driverId: number;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber: number;

  @Column({
    type: 'enum',
    enum: DispatchStatusType,
    enumName: 'dispatch_status_type',
  })
  status: DispatchStatusType;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;
}
