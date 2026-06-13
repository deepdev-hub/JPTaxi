import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SavedPlaceType {
  home = 'home',
  work = 'work',
  favorite = 'favorite',
  custom = 'custom',
}

@Entity({ name: 'customer_saved_place' })
export class CustomerSavedPlace {
  @PrimaryGeneratedColumn({ name: 'saved_place_id' })
  savedPlaceId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({
    type: 'enum',
    enum: SavedPlaceType,
    enumName: 'saved_place_type',
    default: SavedPlaceType.custom,
  })
  type: SavedPlaceType;

  @Column({ type: 'varchar', length: 60 })
  label: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
