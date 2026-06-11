import { IsEnum, IsInt, IsString, MinLength } from 'class-validator';
import { PaymentMethodEnum } from '../../../entities/payment-transaction.entity';

export class ProcessPaymentDto {
  @IsInt()
  tripId: number;

  @IsEnum(PaymentMethodEnum)
  paymentMethod: PaymentMethodEnum;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu xác nhận phải có ít nhất 6 ký tự.' })
  password: string;
}
