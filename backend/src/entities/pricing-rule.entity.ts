import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'pricing_rule' })
export class PricingRule {
  @PrimaryGeneratedColumn({ name: 'rule_id' })
  ruleId: number;

  @Column({ name: 'start_km', type: 'decimal', precision: 8, scale: 2 })
  startKm: string;

  @Column({ name: 'end_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  endKm: string | null;

  @Column({ name: 'price_per_km_vnd', type: 'decimal', precision: 10, scale: 2 })
  pricePerKmVnd: string;

  @Column({ name: 'is_base_fare', type: 'boolean', default: false })
  isBaseFare: boolean;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'int' })
  priority: number;
}
