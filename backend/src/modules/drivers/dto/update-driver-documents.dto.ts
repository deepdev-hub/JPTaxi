import { IsOptional, IsString } from 'class-validator';

export class UpdateDriverDocumentsDto {
  @IsOptional()
  @IsString()
  portrait?: string | null;

  @IsOptional()
  @IsString()
  licenseFront?: string | null;

  @IsOptional()
  @IsString()
  licenseBack?: string | null;

  @IsOptional()
  @IsString()
  vehiclePhoto?: string | null;

  @IsOptional()
  @IsString()
  registrationPaper?: string | null;
}
