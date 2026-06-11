import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { VehicleTypeEnum } from '../../../entities/vehicle.entity';

export class CreateRideRequestDto {
  @IsString()
  @Length(1, 255)
  pickupAddress: string;

  @Type(() => Number)
  @IsNumber()
  pickupLat: number;

  @Type(() => Number)
  @IsNumber()
  pickupLng: number;

  @IsString()
  @Length(1, 255)
  dropoffAddress: string;

  @Type(() => Number)
  @IsNumber()
  dropoffLat: number;

  @Type(() => Number)
  @IsNumber()
  dropoffLng: number;

  @IsEnum(VehicleTypeEnum)
  vehicleType: VehicleTypeEnum;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  actualPassengerName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 15)
  actualPassengerPhone?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  noteToDriver?: string;

}
