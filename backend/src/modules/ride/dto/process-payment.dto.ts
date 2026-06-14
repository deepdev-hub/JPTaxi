import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PaymentMethodEnum } from '../../../entities/payment-transaction.entity';

export class ProcessPaymentDto {
  @IsInt()
  tripId: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @IsOptional()
  @IsInt()
  paymentMethodId?: number;

  @IsString()
  @Length(8, 100)
  idempotencyKey: string;

  @ValidateIf((o) => o.paymentMethod !== PaymentMethodEnum.CASH)
  @IsString()
  @MinLength(6)
  password?: string;
}
