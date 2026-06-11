import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { InvoicesService } from './invoices.service';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('trips')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  /** Xem trước / tải dữ liệu mẫu hóa đơn VAT theo chuyến đi. */
  @Get(':tripId/invoice')
  getInvoice(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    return this.invoices.getTripInvoice(tripId, req.user);
  }

  /** Xuất hóa đơn VAT (ghi audit, idempotent nếu đã xuất). */
  @Post(':tripId/invoice/issue')
  issueInvoice(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() dto: IssueInvoiceDto,
  ) {
    return this.invoices.issueTripInvoice(tripId, req.user, dto);
  }
}
