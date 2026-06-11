// backend/src/modules/ride/dto/route.dto.ts
//dto api trả về dữ liệu tọa độ lộ trình từ điểm xuất phát đến đích
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsString } from 'class-validator';

export class RouteDto {
  @IsLatitude()
    startLat!: number;

  @IsLongitude()
    startLng!: number;

  @IsLatitude()
    endLat!: number;

  @IsLongitude()
    endLng!: number;

  @IsString()
  vehicleType?: string;
}