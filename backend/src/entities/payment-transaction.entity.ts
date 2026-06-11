import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PaymentMethodEnum {
  VISA = 'VISA',
  MASTER = 'MASTER',
  JCB = 'JCB',
  VNPAY = 'VNPAY',
}

export enum PaymentStatusType {
  pending = 'pending',
  success = 'success',
  failed = 'failed',
}

@Entity({ name: 'payment_transaction' })
export class PaymentTransaction {
  @PrimaryGeneratedColumn({ name: 'transaction_id' })
  transactionId: number;

  @Column({ name: 'trip_id', type: 'int', unique: true })
  tripId: number;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethodEnum,
    enumName: 'payment_method_enum',
  })
  paymentMethod: PaymentMethodEnum;

  @Column({ name: 'amount_vnd', type: 'int' })
  amountVnd: number;

  @Column({
    type: 'enum',
    enum: PaymentStatusType,
    enumName: 'payment_status_type',
  })
  status: PaymentStatusType;

  @Column({ name: 'gateway_transaction_id', type: 'varchar', length: 100, nullable: true })
  gatewayTransactionId: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;
}
