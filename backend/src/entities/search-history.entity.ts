import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'search_history' })
export class SearchHistory {
  @PrimaryGeneratedColumn({ name: 'search_id' })
  searchId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ name: 'search_text', type: 'varchar', length: 255 })
  searchText: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'searched_at', type: 'timestamptz' })
  searchedAt: Date;
}
