// backend/src/modules/drivers/dto/apply-driver.dto.ts
import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class ApplyDriverDto {
  @IsNotEmpty()
    @IsString()
    licenseNumber!: string;

  @IsNotEmpty()
      @IsString()
     licenseType!: string;

  @IsNotEmpty()
    @IsString()
    vehiclePlate!: string;

  @IsNotEmpty()
    @IsString()
    vehicleType!: string; // '4', '7', '9'

  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @IsOptional()
  @IsBoolean()
  hasInsurance?: boolean;
}