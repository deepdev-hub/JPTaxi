import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class EstimateDto {
  @Type(() => Number)
  @IsNumber()
  startLat: number;

  @Type(() => Number)
  @IsNumber()
  startLng: number;

  @Type(() => Number)
  @IsNumber()
  endLat: number;

  @Type(() => Number)
  @IsNumber()
  endLng: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;
}
