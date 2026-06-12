import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'driver_insurance' })
export class DriverInsurance {
  @PrimaryGeneratedColumn({ name: 'insurance_id' })
  insuranceId: number;

  @Column({ name: 'driver_id', unique: true })
  driverId: number;

  @Column({ name: 'provider_name', type: 'varchar', length: 120 })
  providerName: string;

  @Column({ name: 'policy_number', type: 'varchar', length: 80 })
  policyNumber: string;

  @Column({ name: 'effective_date', type: 'date' })
  effectiveDate: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Column({ name: 'document_url', type: 'varchar', length: 255 })
  documentUrl: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
