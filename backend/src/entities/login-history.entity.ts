import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum LoginUserType {
  customer = 'customer',
  driver = 'driver',
}

@Entity({ name: 'login_history' })
export class LoginHistory {
  @PrimaryGeneratedColumn({ name: 'login_id' })
  loginId: number;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: LoginUserType,
    enumName: 'user_type_enum',
  })
  userType: LoginUserType;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'login_time', type: 'timestamptz' })
  loginTime: Date;
}
