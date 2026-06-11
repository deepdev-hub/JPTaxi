import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { DriverJapaneseLevelEnum } from '../../../entities/driver.entity';
import { VehicleTypeEnum } from '../../../entities/vehicle.entity';

export enum DriverSearchSort {
  distance = 'distance',
  rating = 'rating',
}

export class SearchDriversQueryDto {
  @Type(() => Number)
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsLongitude()
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  radiusKm?: number;

  /** Chỉ tài xế có bản ghi vị trí trong khoảng thời gian này (phút) — proxy cho trạng thái sẵn sàng. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(24 * 60)
  maxLocationAgeMinutes?: number;

  @IsOptional()
  @IsEnum(VehicleTypeEnum)
  vehicleType?: VehicleTypeEnum;

  /** Tài xế có trình độ tiếng Nhật >= mức này (N5 thấp nhất, Native cao nhất). */
  @IsOptional()
  @IsEnum(DriverJapaneseLevelEnum)
  minJapaneseLevel?: DriverJapaneseLevelEnum;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsIn([DriverSearchSort.distance, DriverSearchSort.rating])
  sort?: DriverSearchSort;
}
