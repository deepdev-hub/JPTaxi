import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StoredPaymentBrand {
  VISA = 'VISA',
  MASTER = 'MASTER',
  JCB = 'JCB',
}

@Entity({ name: 'customer_payment_method' })
export class CustomerPaymentMethod {
  @PrimaryGeneratedColumn({ name: 'payment_method_id' })
  paymentMethodId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ type: 'enum', enum: StoredPaymentBrand, enumName: 'stored_payment_brand' })
  brand: StoredPaymentBrand;

  @Column({ name: 'holder_name', type: 'varchar', length: 100 })
  holderName: string;

  @Column({ name: 'last_four', type: 'char', length: 4 })
  lastFour: string;

  @Column({ name: 'expiry_month', type: 'smallint' })
  expiryMonth: number;

  @Column({ name: 'expiry_year', type: 'smallint' })
  expiryYear: number;

  @Column({ name: 'billing_address', type: 'varchar', length: 255, nullable: true })
  billingAddress: string | null;

  @Column({ name: 'provider_token', type: 'varchar', length: 100, unique: true })
  providerToken: string;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
