import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'ride_search_driver_exclusion' })
@Index(['searchGroupId', 'driverId'], { unique: true })
export class RideSearchDriverExclusion {
  @PrimaryGeneratedColumn({ name: 'exclusion_id' })
  exclusionId: number;

  @Column({ name: 'search_group_id', type: 'uuid' })
  searchGroupId: string;

  @Column({ name: 'driver_id', type: 'int' })
  driverId: number;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @Column({ type: 'varchar', length: 32 })
  reason: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
