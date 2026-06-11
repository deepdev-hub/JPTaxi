import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'driver_bank_account' })
export class DriverBankAccount {
  @PrimaryGeneratedColumn({ name: 'account_id' })
  accountId: number;

  @Column({ name: 'driver_id', unique: true })
  driverId: number;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({ name: 'account_number', type: 'varchar', length: 30 })
  accountNumber: string;

  @Column({ name: 'account_holder', type: 'varchar', length: 100 })
  accountHolder: string;
}
