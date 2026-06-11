import { IsEmail, IsOptional } from 'class-validator';

export class IssueInvoiceDto {
  @IsOptional()
  @IsEmail()
  recipientEmail?: string;
}
