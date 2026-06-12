import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class UpdateDriverInsuranceDto {
  @IsString()
  @IsNotEmpty()
  providerName: string;

  @IsString()
  @IsNotEmpty()
  policyNumber: string;

  @IsDateString()
  effectiveDate: string;

  @IsDateString()
  expiryDate: string;

  @IsString()
  @IsNotEmpty()
  documentUrl: string;
}
