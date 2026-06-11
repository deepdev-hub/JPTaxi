import { Type } from 'class-transformer';
import { IsInt, IsPositive } from 'class-validator';
import { IssueInvoiceDto } from './issue-invoice.dto';

export class InvoiceActionDto extends IssueInvoiceDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  tripId: number;
}
