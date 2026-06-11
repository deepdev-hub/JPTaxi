import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class SelectPickupDto {
  @IsNotEmpty()
  @IsNumber()
  rideRequestId: number;

  @IsNotEmpty()
  @IsNumber()
  pickupLat: number;

  @IsNotEmpty()
  @IsNumber()
  pickupLng: number;

  @IsString()
  @IsOptional()
  pickupAddress?: string;

  @IsString()
  @IsOptional()
  note?: string;
}