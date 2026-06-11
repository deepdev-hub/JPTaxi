import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum GenderType {
  Male = 'Male',
  Female = 'Female',
  Other = 'Other',
}

@Entity({ name: 'customer' })
export class Customer {
  @PrimaryGeneratedColumn({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'last_name', type: 'varchar', length: 25 })
  lastName: string;

  @Column({ name: 'first_name', type: 'varchar', length: 25 })
  firstName: string;

  @Column({ type: 'enum', enum: GenderType, enumName: 'gender_type' })
  gender: GenderType;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'is_phone_verified', type: 'boolean', default: false })
  isPhoneVerified: boolean;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}
