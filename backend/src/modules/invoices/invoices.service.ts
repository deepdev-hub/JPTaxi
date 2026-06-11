import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildInvoiceNumber,
  calculateVatFromInclusiveTotal,
  DEFAULT_VAT_RATE_PERCENT,
  splitFareAndServiceFee,
  vndToJpy,
} from '../../common/invoice-vat.util';
import { AuditLog, UserTypeEnum } from '../../entities/audit-log.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import {
  PaymentStatusType,
  PaymentTransaction,
} from '../../entities/payment-transaction.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { INVOICE_ACTION_ISSUED, INVOICE_SELLER } from './invoice.constants';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';

const PAYMENT_LABEL_JA: Record<string, string> = {
  VISA: 'VISA',
  MASTER: 'Mastercard',
  JCB: 'JCB',
  VNPAY: 'VNPAY',
};

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    @InjectRepository(PaymentTransaction)
    private readonly payments: Repository<PaymentTransaction>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async getTripInvoice(
    tripId: number,
    user: { id: number; role: string },
  ) {
    const trip = await this.loadTripOrThrow(tripId);
    await this.assertTripAccess(trip, user);

    const payment = await this.payments.findOne({ where: { tripId } });
    const issued = await this.findIssuedRecord(tripId);
    const payload = await this.buildInvoicePayload(trip, payment, issued);

    return {
      ...payload,
      canIssue:
        trip.status === TripStatusType.completed &&
        payment?.status === PaymentStatusType.success &&
        !issued,
    };
  }

  async issueTripInvoice(
    tripId: number,
    user: { id: number; role: string },
    dto: IssueInvoiceDto,
  ) {
    const trip = await this.loadTripOrThrow(tripId);
    await this.assertTripAccess(trip, user);

    if (trip.status !== TripStatusType.completed) {
      throw new BadRequestException(
        'Chỉ có thể xuất hóa đơn cho chuyến đi đã hoàn thành.',
      );
    }

    const payment = await this.payments.findOne({ where: { tripId } });
    if (!payment || payment.status !== PaymentStatusType.success) {
      throw new BadRequestException(
        'Chuyến đi chưa thanh toán thành công — chưa thể xuất hóa đơn VAT.',
      );
    }

    const existing = await this.findIssuedRecord(tripId);
    if (existing) {
      const payload = await this.buildInvoicePayload(trip, payment, existing);
      return {
        message: 'Hóa đơn đã được xuất trước đó.',
        alreadyIssued: true,
        invoice: payload,
      };
    }

    const issuedAt = new Date();
    const invoiceNumber = buildInvoiceNumber(tripId, issuedAt);
    const payload = await this.buildInvoicePayload(
      trip,
      payment,
      { invoiceNumber, issuedAt },
    );

    const userType =
      user.role === 'driver' ? UserTypeEnum.driver : UserTypeEnum.customer;

    await this.auditLogs.save(
      this.auditLogs.create({
        userType,
        userId: user.id,
        action: INVOICE_ACTION_ISSUED,
        metadata: {
          tripId,
          invoiceNumber,
          recipientEmail: dto.recipientEmail ?? null,
          totalVnd: payload.amounts.vnd.totalInclTax,
          vatAmountVnd: payload.amounts.vnd.vatAmount,
        },
      }),
    );

    return {
      message: dto.recipientEmail
        ? `Đã xuất hóa đơn và gửi bản sao tới ${dto.recipientEmail}.`
        : 'Đã xuất hóa đơn VAT thành công.',
      alreadyIssued: false,
      invoice: {
        ...payload,
        issued: true,
        issuedAt: issuedAt.toISOString(),
        recipientEmail: dto.recipientEmail ?? null,
      },
    };
  }

  private async loadTripOrThrow(tripId: number): Promise<Trip> {
    const trip = await this.trips.findOne({
      where: { tripId },
      relations: ['rideRequest'],
    });
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi.');
    }
    return trip;
  }

  private async assertTripAccess(
    trip: Trip,
    user: { id: number; role: string },
  ): Promise<void> {
    if (user.role === 'driver') {
      if (trip.driverId !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem hóa đơn chuyến này.');
      }
      return;
    }
    if (trip.rideRequest.customerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem hóa đơn chuyến này.');
    }
  }

  private async findIssuedRecord(tripId: number): Promise<{
    invoiceNumber: string;
    issuedAt: Date;
    recipientEmail?: string | null;
  } | null> {
    const log = await this.auditLogs
      .createQueryBuilder('log')
      .where('log.action = :action', { action: INVOICE_ACTION_ISSUED })
      .andWhere("log.metadata->>'tripId' = :tripId", { tripId: String(tripId) })
      .orderBy('log.log_timestamp', 'DESC')
      .getOne();

    if (!log?.metadata) {
      return null;
    }

    return {
      invoiceNumber: String(log.metadata.invoiceNumber ?? buildInvoiceNumber(tripId)),
      issuedAt: log.logTimestamp,
      recipientEmail:
        log.metadata.recipientEmail != null
          ? String(log.metadata.recipientEmail)
          : null,
    };
  }

  private async buildInvoicePayload(
    trip: Trip,
    payment: PaymentTransaction | null,
    issued: {
      invoiceNumber: string;
      issuedAt: Date;
      recipientEmail?: string | null;
    } | null,
  ) {
    const request = trip.rideRequest;
    const rate = Number(trip.exchangeRateVndToJpy);
    const { fareVnd, serviceFeeVnd } = splitFareAndServiceFee(
      trip.finalFareVnd,
      trip.rawFareVnd,
    );
    const fareJpy = vndToJpy(fareVnd, rate);
    const serviceFeeJpy = vndToJpy(serviceFeeVnd, rate);
    const totalJpy = trip.finalFareJpy;
    const totalVnd = trip.finalFareVnd;

    const vatJpy = calculateVatFromInclusiveTotal(
      totalJpy,
      DEFAULT_VAT_RATE_PERCENT,
    );
    const vatVnd = calculateVatFromInclusiveTotal(
      totalVnd,
      DEFAULT_VAT_RATE_PERCENT,
    );

    const customer = await this.customers.findOne({
      where: { customerId: request.customerId },
    });
    const driver = await this.drivers.findOne({
      where: { driverId: trip.driverId },
    });

    const serviceTime = trip.endTime ?? trip.startTime;
    const invoiceNumber =
      issued?.invoiceNumber ?? buildInvoiceNumber(trip.tripId, serviceTime);

    return {
      tripId: trip.tripId,
      invoiceNumber,
      documentType: 'vat_invoice',
      title: '電子領収書',
      titleVi: 'Hóa đơn điện tử (VAT)',
      issued: Boolean(issued),
      issuedAt: issued?.issuedAt?.toISOString() ?? null,
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
            name: `${driver.lastName} ${driver.firstName}`.trim(),
            driverId: driver.driverId,
          }
        : null,
      trip: {
        pickupAddress: request.pickupAddress,
        dropoffAddress: request.dropoffAddress,
        distanceKm: Number(trip.actualDistanceKm),
        vehicleType: request.vehicleType,
        startTime: trip.startTime.toISOString(),
        endTime: trip.endTime?.toISOString() ?? null,
        serviceTime: serviceTime.toISOString(),
      },
      payment: payment
        ? {
            method: payment.paymentMethod,
            methodLabelJa: this.paymentLabelJa(payment.paymentMethod),
            gatewayTransactionId: payment.gatewayTransactionId,
            paidAt: payment.paidAt?.toISOString() ?? null,
            status: payment.status,
          }
        : null,
      lineItems: [
        {
          code: 'TAXI_FARE',
          labelJa: `タクシー運賃 (${Number(trip.actualDistanceKm).toFixed(1)} km)`,
          labelVi: `Cước taxi (${Number(trip.actualDistanceKm).toFixed(1)} km)`,
          amountJpy: fareJpy,
          amountVnd: fareVnd,
        },
        {
          code: 'SERVICE_FEE',
          labelJa: '予約・配車手数料',
          labelVi: 'Phí đặt xe / điều phối',
          amountJpy: serviceFeeJpy,
          amountVnd: serviceFeeVnd,
        },
      ],
      amounts: {
        jpy: vatJpy,
        vnd: vatVnd,
        exchangeRateVndToJpy: rate,
      },
      qrPayload: `JPTAXI|${invoiceNumber}|${totalJpy}|JPY|${trip.tripId}`,
    };
  }

  private paymentLabelJa(method: string): string {
    const base = PAYMENT_LABEL_JA[method] ?? method;
    if (method === 'VISA' || method === 'MASTER' || method === 'JCB') {
      return `${base} (**** 4821)`;
    }
    return base;
  }
}
