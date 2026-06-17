import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GenderType } from './customer.entity';

export enum DriverStatusType {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  suspended = 'suspended',
}

export enum DriverJapaneseLevelEnum {
  N5 = 'N5',
  N4 = 'N4',
  N3 = 'N3',
  N2 = 'N2',
  N1 = 'N1',
  Native = 'Native',
}

@Entity({ name: 'driver' })
export class Driver {
  @PrimaryGeneratedColumn({ name: 'driver_id' })
  driverId: number;

  @Column({ name: 'last_name', type: 'varchar', length: 25 })
  lastName: string;

  @Column({ name: 'first_name', type: 'varchar', length: 25 })
  firstName: string;

  @Column({ type: 'enum', enum: GenderType, enumName: 'gender_type' })
  gender: GenderType;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 50 })
  nationality: string;

  @Column({ name: 'id_number', type: 'varchar', length: 20, nullable: true })
  idNumber: string | null;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({
    type: 'enum',
    enum: DriverStatusType,
    enumName: 'driver_status_type',
    default: DriverStatusType.pending,
  })
  status: DriverStatusType;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({
    name: 'driver_japanese_level',
    type: 'enum',
    enum: DriverJapaneseLevelEnum,
    enumName: 'driver_japanese_level_enum',
  })
  driverJapaneseLevel: DriverJapaneseLevelEnum;

  @Column({
    name: 'japanese_certificate_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  japaneseCertificateUrl: string | null;

  @Column({ name: 'is_online', type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;
}
