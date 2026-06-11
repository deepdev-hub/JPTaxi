import { IsEnum } from 'class-validator';
import { RideRequestStatusType } from '../../../entities/ride-request.entity';

export class UpdateRideRequestStatusDto {
  @IsEnum(RideRequestStatusType)
  status: RideRequestStatusType;
}
