import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'customer_notification_preference' })
export class CustomerNotificationPreference {
  @PrimaryColumn({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ name: 'ride_updates', type: 'boolean', default: true })
  rideUpdates: boolean;

  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'promotions', type: 'boolean', default: false })
  promotions: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
