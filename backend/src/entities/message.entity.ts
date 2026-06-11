import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MessageSenderType {
  customer = 'customer',
  driver = 'driver',
}

@Entity({ name: 'message' })
export class Message {
  @PrimaryGeneratedColumn({ name: 'message_id' })
  messageId: number;

  @Column({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: MessageSenderType,
    enumName: 'message_sender_type',
  })
  senderType: MessageSenderType;

  @Column({ name: 'sender_id', type: 'int' })
  senderId: number;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamptz' })
  sentAt: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;
}
