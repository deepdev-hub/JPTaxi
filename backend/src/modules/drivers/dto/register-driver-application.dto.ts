import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { GenderType } from '../../../entities/customer.entity';
import {
  DriverJapaneseLevelEnum,
} from '../../../entities/driver.entity';
import { LicenseTypeEnum } from '../../../entities/driver-license.entity';
import { VehicleTypeEnum } from '../../../entities/vehicle.entity';

export class RegisterDriverApplicationDto {
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsEnum(GenderType)
  gender: GenderType;

  @IsDateString()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  nationality: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsEnum(DriverJapaneseLevelEnum)
  japaneseLevel: DriverJapaneseLevelEnum;

  @IsEnum(LicenseTypeEnum)
  licenseType: LicenseTypeEnum;

  @IsDateString()
  licenseIssueDate: string;

  @IsOptional()
  @IsString()
  licenseIssuePlace?: string;

  @IsDateString()
  licenseExpiryDate: string;

  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsString()
  @IsNotEmpty()
  vehicleBrand: string;

  @IsString()
  @IsNotEmpty()
  vehicleColor: string;

  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(new Date().getFullYear() + 1)
  manufactureYear: number;

  @Transform(({ value }) => value === true || value === 'true')
  @Equals(true, { message: '利用規約への同意が必要です' })
  agreeToTerms: boolean;
}
