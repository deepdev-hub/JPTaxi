import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { GenderType } from '../../../entities/customer.entity';
import { DriverJapaneseLevelEnum } from '../../../entities/driver.entity';
import { LicenseTypeEnum } from '../../../entities/driver-license.entity';
import { VehicleTypeEnum } from '../../../entities/vehicle.entity';

export class RegisterDto {
  @IsOptional()
  @IsIn(['customer', 'driver'])
  role?: 'customer' | 'driver';

  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsEnum(GenderType)
  gender?: GenderType;

  /** ISO date (YYYY-MM-DD). Nếu bỏ trống, backend gán mặc định để tương thích schema DB. */
  @IsOptional()
  @IsString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  id_number?: string;

  @IsOptional()
  @IsEnum(DriverJapaneseLevelEnum)
  japanese_level?: DriverJapaneseLevelEnum;

  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsEnum(LicenseTypeEnum)
  license_type?: LicenseTypeEnum;

  @IsOptional()
  @IsString()
  license_expiry_date?: string;

  @IsOptional()
  @IsString()
  vehicle_brand?: string;

  @IsOptional()
  @IsString()
  vehicle_color?: string;

  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicle_type?: VehicleTypeEnum;

  @IsOptional()
  @IsString()
  license_plate?: string;

  @IsOptional()
  @IsString()
  portrait_url?: string;

  @IsOptional()
  @IsString()
  license_front_url?: string;

  @IsOptional()
  @IsString()
  license_back_url?: string;

  @IsOptional()
  @IsString()
  vehicle_photo_url?: string;

  @IsOptional()
  @IsString()
  registration_paper_url?: string;
}
