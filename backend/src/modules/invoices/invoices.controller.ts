import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { InvoiceActionDto } from './dto/invoice-action.dto';
import { InvoicesService } from './invoices.service';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('trips')
@UseGuards(AuthGuard('jwt'))
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get(':tripId/invoice')
  getInvoice(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    return this.invoices.getTripInvoice(tripId, req.user);
  }

}

@Controller('invoice')
@UseGuards(AuthGuard('jwt'))
export class InvoiceActionsController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('issue')
  issueInvoice(
    @Req() req: AuthedRequest,
    @Body() dto: InvoiceActionDto,
  ) {
    return this.invoices.issueTripInvoice(dto.tripId, req.user, dto);
  }

  @Get('pdf')
  async downloadPdf(
    @Req() req: AuthedRequest,
    @Query('tripId', ParseIntPipe) tripId: number,
    @Res() response: Response,
  ) {
    const pdf = await this.invoices.getInvoicePdf(tripId, req.user);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${pdf.filename}"`,
    );
    response.send(pdf.buffer);
  }

  @Post('email')
  emailInvoice(
    @Req() req: AuthedRequest,
    @Body() dto: InvoiceActionDto,
  ) {
    return this.invoices.emailInvoice(dto.tripId, req.user, dto);
  }
}
