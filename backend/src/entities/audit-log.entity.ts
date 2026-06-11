import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum UserTypeEnum {
  customer = 'customer',
  driver = 'driver',
  admin = 'admin',
}

@Entity({ name: 'audit_log' })
export class AuditLog {
  @PrimaryGeneratedColumn({ name: 'log_id' })
  logId: number;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserTypeEnum,
    enumName: 'user_type_enum',
  })
  userType: UserTypeEnum;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'log_timestamp', type: 'timestamptz' })
  logTimestamp: Date;
}
