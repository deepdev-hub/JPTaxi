import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'conversation' })
export class Conversation {
  @PrimaryGeneratedColumn({ name: 'conversation_id' })
  conversationId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ name: 'driver_id', type: 'int' })
  driverId: number;

  @Column({ name: 'request_id', type: 'int', nullable: true })
  requestId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;
}
