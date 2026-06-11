import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { GenderType } from '../../../entities/customer.entity';

export class UpdateCustomerProfileDto {
  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsEnum(GenderType)
  gender: GenderType;

  @IsOptional()
  @IsString()
  birthDate?: string | null;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
