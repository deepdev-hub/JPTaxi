import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SubmitRatingDto {
  @Type(() => Number)
  @IsIn([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
  @Min(0.5)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayMaxSize(8)
  tags?: string[];
}
