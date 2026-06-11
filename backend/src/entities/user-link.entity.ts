import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_link' })
export class UserLink {
  @PrimaryColumn({ name: 'customer_id', type: 'int' })
  customerId: number;

  @PrimaryColumn({ name: 'driver_id', type: 'int' })
  driverId: number;
}
