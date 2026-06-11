import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import {
  buildInvoiceNumber,
  calculateVatFromInclusiveTotal,
  DEFAULT_VAT_RATE_PERCENT,
  splitFareAndServiceFee,
  vndToJpy,
} from '../../common/invoice-vat.util';
import { AuditLog, UserTypeEnum } from '../../entities/audit-log.entity';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Invoice } from '../../entities/invoice.entity';
import {
  PaymentStatusType,
  PaymentTransaction,
} from '../../entities/payment-transaction.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { MailService } from '../mail/mail.service';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { INVOICE_ACTION_ISSUED, INVOICE_SELLER } from './invoice.constants';

type AuthUser = { id: number; role: string };
type InvoicePayload = Record<string, any>;

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    @InjectRepository(PaymentTransaction)
    private readonly payments: Repository<PaymentTransaction>,
    @InjectRepository(CustomerPaymentMethod)
    private readonly paymentMethods: Repository<CustomerPaymentMethod>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Invoice)
    private readonly invoices: Repository<Invoice>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
    private readonly mail: MailService,
  ) {}

  async getTripInvoice(tripId: number, user: AuthUser) {
    const trip = await this.loadTripOrThrow(tripId);
    await this.assertTripAccess(trip, user);
    const existing = await this.invoices.findOne({ where: { tripId } });
    if (existing) {
      return { ...existing.payload, canIssue: false };
    }

    const payment = await this.payments.findOne({ where: { tripId } });
    return {
      ...(await this.buildInvoicePayload(trip, payment, null)),
      canIssue:
        trip.status === TripStatusType.completed &&
        payment?.status === PaymentStatusType.success,
    };
  }

  async issueTripInvoice(
    tripId: number,
    user: AuthUser,
    dto: IssueInvoiceDto,
  ) {
    const trip = await this.loadTripOrThrow(tripId);
    await this.assertTripAccess(trip, user);
    const existing = await this.invoices.findOne({ where: { tripId } });
    if (existing) {
      return {
        message: 'Invoice was already issued.',
        alreadyIssued: true,
        invoice: existing.payload,
      };
    }
    if (trip.status !== TripStatusType.completed) {
      throw new BadRequestException('Only completed trips can be invoiced.');
    }

    const payment = await this.payments.findOne({ where: { tripId } });
    if (!payment || payment.status !== PaymentStatusType.success) {
      throw new BadRequestException('The trip has not been paid successfully.');
    }

    const issuedAt = new Date();
    const invoiceNumber = buildInvoiceNumber(tripId, issuedAt);
    const payload = await this.buildInvoicePayload(trip, payment, {
      invoiceNumber,
      issuedAt,
      recipientEmail: dto.recipientEmail ?? null,
    });
    const invoice = await this.invoices.save(
      this.invoices.create({
        tripId,
        invoiceNumber,
        recipientEmail: dto.recipientEmail ?? null,
        payload,
        issuedAt,
        emailedAt: null,
      }),
    );

    await this.auditLogs.save(
      this.auditLogs.create({
        userType: this.auditUserType(user.role),
        userId: user.id,
        action: INVOICE_ACTION_ISSUED,
        metadata: { tripId, invoiceNumber },
      }),
    );

    return {
      message: 'Invoice issued successfully.',
      alreadyIssued: false,
      invoice: invoice.payload,
    };
  }

  async getInvoicePdf(tripId: number, user: AuthUser): Promise<{
    filename: string;
    buffer: Buffer;
  }> {
    const invoice = await this.loadIssuedInvoice(tripId, user);
    return {
      filename: `${invoice.invoiceNumber}.pdf`,
      buffer: await this.renderPdf(invoice.payload),
    };
  }

  async emailInvoice(
    tripId: number,
    user: AuthUser,
    dto: IssueInvoiceDto,
  ) {
    const invoice = await this.loadIssuedInvoice(tripId, user);
    const payload = invoice.payload as InvoicePayload;
    const buyer = payload.buyer as { email?: string } | null;
    const recipient = dto.recipientEmail ?? invoice.recipientEmail ?? buyer?.email;
    if (!recipient) {
      throw new BadRequestException('An invoice recipient email is required.');
    }

    const pdf = await this.renderPdf(payload);
    await this.mail.sendInvoice(recipient, invoice.invoiceNumber, pdf);
    invoice.recipientEmail = recipient;
    invoice.emailedAt = new Date();
    await this.invoices.save(invoice);
    return { message: 'Invoice email sent.', recipientEmail: recipient };
  }

  private async loadIssuedInvoice(
    tripId: number,
    user: AuthUser,
  ): Promise<Invoice> {
    const trip = await this.loadTripOrThrow(tripId);
    await this.assertTripAccess(trip, user);
    const invoice = await this.invoices.findOne({ where: { tripId } });
    if (!invoice) {
      throw new NotFoundException('Issue the invoice before downloading or emailing it.');
    }
    return invoice;
  }

  private async loadTripOrThrow(tripId: number): Promise<Trip> {
    const trip = await this.trips.findOne({
      where: { tripId },
      relations: ['rideRequest'],
    });
    if (!trip) {
      throw new NotFoundException('Trip not found.');
    }
    return trip;
  }

  private async assertTripAccess(trip: Trip, user: AuthUser): Promise<void> {
    if (user.role === 'admin') {
      return;
    }
    const ownsTrip =
      user.role === 'driver'
        ? trip.driverId === user.id
        : user.role === 'customer' && trip.rideRequest.customerId === user.id;
    if (!ownsTrip) {
      throw new ForbiddenException('You cannot access this trip invoice.');
    }
  }

  private auditUserType(role: string): UserTypeEnum {
    if (role === 'driver') {
      return UserTypeEnum.driver;
    }
    if (role === 'admin') {
      return UserTypeEnum.admin;
    }
    return UserTypeEnum.customer;
  }

  private async buildInvoicePayload(
    trip: Trip,
    payment: PaymentTransaction | null,
    issued: {
      invoiceNumber: string;
      issuedAt: Date;
      recipientEmail: string | null;
    } | null,
  ): Promise<InvoicePayload> {
    const request = trip.rideRequest;
    const rate = Number(trip.exchangeRateVndToJpy);
    const { fareVnd, serviceFeeVnd } = splitFareAndServiceFee(
      trip.finalFareVnd,
      trip.rawFareVnd,
    );
    const customer = await this.customers.findOne({
      where: { customerId: request.customerId },
    });
    const driver = await this.drivers.findOne({
      where: { driverId: trip.driverId },
    });
    const storedMethod = payment?.paymentMethodId
      ? await this.paymentMethods.findOne({
          where: { paymentMethodId: payment.paymentMethodId },
        })
      : null;
    const serviceTime = trip.endTime ?? trip.startTime;
    const invoiceNumber =
      issued?.invoiceNumber ?? buildInvoiceNumber(trip.tripId, serviceTime);

    return {
      tripId: trip.tripId,
      invoiceNumber,
      documentType: 'vat_invoice',
      title: 'Electronic taxi receipt',
      issued: Boolean(issued),
      issuedAt: issued?.issuedAt.toISOString() ?? null,
      recipientEmail: issued?.recipientEmail ?? null,
      seller: INVOICE_SELLER,
      buyer: customer
        ? {
            name: `${customer.lastName} ${customer.firstName}`.trim(),
            email: customer.email,
            phone: customer.phone,
          }
        : null,
      driver: driver
        ? {
            driverId: driver.driverId,
            name: `${driver.lastName} ${driver.firstName}`.trim(),
          }
        : null,
      trip: {
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress,
        distanceKm: Number(trip.actualDistanceKm),
        vehicleType: request.vehicleType,
        startTime: trip.startTime.toISOString(),
        endTime: trip.endTime?.toISOString() ?? null,
      },
      payment: payment
        ? {
            method: payment.paymentMethod,
            lastFour: storedMethod?.lastFour ?? null,
            gatewayTransactionId: payment.gatewayTransactionId,
            paidAt: payment.paidAt?.toISOString() ?? null,
            status: payment.status,
          }
        : null,
      lineItems: [
        {
          code: 'TAXI_FARE',
          label: `Taxi fare (${Number(trip.actualDistanceKm).toFixed(1)} km)`,
          amountJpy: vndToJpy(fareVnd, rate),
          amountVnd: fareVnd,
        },
        {
          code: 'SERVICE_FEE',
          label: 'Booking and dispatch fee',
          amountJpy: vndToJpy(serviceFeeVnd, rate),
          amountVnd: serviceFeeVnd,
        },
      ],
      amounts: {
        jpy: calculateVatFromInclusiveTotal(
          trip.finalFareJpy,
          DEFAULT_VAT_RATE_PERCENT,
        ),
        vnd: calculateVatFromInclusiveTotal(
          trip.finalFareVnd,
          DEFAULT_VAT_RATE_PERCENT,
        ),
        exchangeRateVndToJpy: rate,
      },
    };
  }

  private renderPdf(payload: InvoicePayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 48 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const trip = payload.trip as Record<string, unknown>;
      const amounts = payload.amounts as {
        vnd: { subtotalExclTax: number; vatAmount: number; totalInclTax: number };
      };
      doc.fontSize(20).text('JP TAXI - ELECTRONIC RECEIPT');
      doc.moveDown();
      doc.fontSize(11).text(`Invoice: ${String(payload.invoiceNumber)}`);
      doc.text(`Issued: ${String(payload.issuedAt)}`);
      doc.text(`Trip: #${String(payload.tripId)}`);
      doc.moveDown();
      doc.text(`Pickup: ${String(trip.pickupAddress)}`);
      doc.text(`Drop-off: ${String(trip.dropoffAddress)}`);
      doc.text(`Distance: ${String(trip.distanceKm)} km`);
      doc.moveDown();
      for (const item of payload.lineItems as Array<Record<string, unknown>>) {
        doc.text(`${String(item.label)}: ${Number(item.amountVnd).toLocaleString()} VND`);
      }
      doc.moveDown();
      doc.text(
        `Subtotal: ${amounts.vnd.subtotalExclTax.toLocaleString()} VND`,
      );
      doc.text(`VAT: ${amounts.vnd.vatAmount.toLocaleString()} VND`);
      doc.fontSize(14).text(
        `Total: ${amounts.vnd.totalInclTax.toLocaleString()} VND`,
      );
      doc.end();
    });
  }
}
