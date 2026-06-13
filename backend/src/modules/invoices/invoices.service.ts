import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
    private readonly dataSource: DataSource,
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
    return this.dataSource.transaction(async (manager) => {
      const trips = manager.getRepository(Trip);
      const invoices = manager.getRepository(Invoice);
      const payments = manager.getRepository(PaymentTransaction);
      const auditLogs = manager.getRepository(AuditLog);
      const trip = await trips
        .createQueryBuilder('trip')
        .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
        .setLock('pessimistic_write')
        .where('trip.trip_id = :tripId', { tripId })
        .getOne();
      if (!trip) {
        throw new NotFoundException('Trip not found.');
      }
      await this.assertTripAccess(trip, user);

      const existing = await invoices.findOne({ where: { tripId } });
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

      const payment = await payments.findOne({ where: { tripId } });
      if (!payment || payment.status !== PaymentStatusType.success) {
        throw new BadRequestException('The trip has not been paid successfully.');
      }

      const issuedAt = new Date();
      const invoiceNumber = buildInvoiceNumber(tripId, issuedAt);
      const payload = await this.buildInvoicePayload(
        trip,
        payment,
        {
          invoiceNumber,
          issuedAt,
          recipientEmail: dto.recipientEmail ?? null,
        },
        manager,
      );
      const invoice = await invoices.save(invoices.create({
        tripId,
        invoiceNumber,
        recipientEmail: dto.recipientEmail ?? null,
        payload,
        issuedAt,
        emailedAt: null,
      }));

      await auditLogs.save(auditLogs.create({
        userType: this.auditUserType(user.role),
        userId: user.id,
        action: INVOICE_ACTION_ISSUED,
        metadata: { tripId, invoiceNumber },
      }));

      return {
        message: 'Invoice issued successfully.',
        alreadyIssued: false,
        invoice: invoice.payload,
      };
    });
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
    manager?: EntityManager,
  ): Promise<InvoicePayload> {
    const customers = manager?.getRepository(Customer) ?? this.customers;
    const drivers = manager?.getRepository(Driver) ?? this.drivers;
    const paymentMethods = manager?.getRepository(CustomerPaymentMethod)
      ?? this.paymentMethods;
    const request = trip.rideRequest;
    const rate = Number(trip.exchangeRateVndToJpy);
    const { fareVnd, serviceFeeVnd } = splitFareAndServiceFee(
      trip.finalFareVnd,
      trip.rawFareVnd,
    );
    const customer = await customers.findOne({
      where: { customerId: request.customerId },
    });
    const driver = await drivers.findOne({
      where: { driverId: trip.driverId },
    });
    const storedMethod = payment?.paymentMethodId
      ? await paymentMethods.findOne({
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
          labelJa: `タクシー運賃 (${Number(trip.actualDistanceKm).toFixed(1)} km)`,
          amountJpy: vndToJpy(fareVnd, rate),
          amountVnd: fareVnd,
        },
        {
          code: 'SERVICE_FEE',
          label: 'Booking and dispatch fee',
          labelJa: '手配料金',
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
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const trip = payload.trip as Record<string, unknown>;
      const amounts = payload.amounts as {
        jpy: { totalInclTax: number; vatAmount: number; vatRatePercent: number };
        vnd: { totalInclTax: number; vatAmount: number };
      };
      const payment = payload.payment as Record<string, unknown>;
      
      const primaryColor = '#047857';
      const textColor = '#1e293b';
      const grayColor = '#64748b';
      const lightGray = '#e2e8f0';

      const fontPath = require('path').join(process.cwd(), 'NotoSansCJKjp-Regular.otf');
      doc.registerFont('NotoSans', fontPath);

      // Header
      doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('JP TAXI', 50, 50);
      
      doc.fillColor(textColor).fontSize(16).font('NotoSans').text('電子領収書', 50, 55, { align: 'right' });
      doc.fillColor(grayColor).fontSize(10).font('Helvetica').text(`NO. ${String(payload.invoiceNumber)}`, 50, 75, { align: 'right' });
      
      doc.moveDown(3);

      // Grid Details
      const startY = doc.y;
      
      // Col 1
      doc.fillColor(grayColor).fontSize(9).font('NotoSans').text('乗車日時', 50, startY);
      doc.fillColor(textColor).fontSize(12).font('NotoSans').text(String(trip.endTime || trip.startTime).replace('T', ' ').substring(0, 16), 50, startY + 15);
      
      // Col 2
      const paymentMethodStr = payment ? `${String(payment.method)} (**** ${String(payment.lastFour)})` : '-';
      doc.fillColor(grayColor).fontSize(9).font('NotoSans').text('決済方法', 300, startY);
      doc.fillColor(textColor).fontSize(12).font('NotoSans').text(paymentMethodStr, 300, startY + 15);

      doc.moveDown(2);
      const row2Y = doc.y;

      // Col 1 - row 2
      doc.fillColor(grayColor).fontSize(9).font('NotoSans').text('乗車場所', 50, row2Y);
      doc.fillColor(textColor).fontSize(11).font('NotoSans').text(String(trip.pickupAddress), 50, row2Y + 15, { width: 230 });

      // Col 2 - row 2
      doc.fillColor(grayColor).fontSize(9).font('NotoSans').text('降車場所', 300, row2Y);
      doc.fillColor(textColor).fontSize(11).font('NotoSans').text(String(trip.dropoffAddress), 300, row2Y + 15, { width: 230 });

      doc.moveDown(4);

      // Table Header
      let tableY = doc.y;
      doc.rect(50, tableY, 495, 25).fill('#f8fafc');
      doc.fillColor(grayColor).fontSize(10).font('NotoSans').text('項目', 60, tableY + 8);
      doc.text('金額', 400, tableY + 8, { width: 135, align: 'right' });
      
      tableY += 25;

      // Table Rows
      doc.font('NotoSans').fontSize(11).fillColor(textColor);
      for (const item of payload.lineItems as Array<Record<string, unknown>>) {
        tableY += 15;
        doc.text(String(item.labelJa || item.label), 60, tableY);
        doc.text(`¥${Number(item.amountJpy).toLocaleString()}`, 400, tableY, { width: 135, align: 'right' });
        
        tableY += 20;
        doc.moveTo(50, tableY).lineTo(545, tableY).lineWidth(1).strokeColor(lightGray).stroke();
      }

      tableY += 20;

      // Summary
      doc.fillColor(grayColor).fontSize(12).font('NotoSans').text('領収金額 (税込)', 300, tableY, { width: 245, align: 'right' });
      tableY += 15;
      doc.fillColor(primaryColor).fontSize(32).font('NotoSans').text(`¥${amounts.jpy.totalInclTax.toLocaleString()}`, 300, tableY, { width: 245, align: 'right' });
      tableY += 35;
      doc.fillColor(grayColor).fontSize(10).font('NotoSans').text(`(内消費税${amounts.jpy.vatRatePercent}% : ¥${amounts.jpy.vatAmount.toLocaleString()})`, 300, tableY, { width: 245, align: 'right' });

      doc.moveDown(5);

      // Footer
      doc.fillColor(grayColor).fontSize(10).font('NotoSans').text('JP TAXIをご利用いただきありがとうございます。', 50, doc.y, { align: 'center' });

      doc.end();
    });
  }
}
