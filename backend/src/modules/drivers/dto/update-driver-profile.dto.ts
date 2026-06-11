import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { GenderType } from '../../../entities/customer.entity';
import { DriverJapaneseLevelEnum } from '../../../entities/driver.entity';

export class UpdateDriverProfileDto {
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

  @IsString()
  nationality: string;

  @IsOptional()
  @IsString()
  idNumber?: string | null;

  @IsEnum(DriverJapaneseLevelEnum)
  japaneseLevel: DriverJapaneseLevelEnum;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
