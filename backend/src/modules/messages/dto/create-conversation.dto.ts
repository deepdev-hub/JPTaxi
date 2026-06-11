import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class CreateConversationDto {
  @IsIn(['customer', 'driver'])
  peerRole: 'customer' | 'driver';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  peerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestId?: number;
}
