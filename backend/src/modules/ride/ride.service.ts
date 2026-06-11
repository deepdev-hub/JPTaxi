import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { RideRequest, RideRequestStatusType } from '../../entities/ride-request.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { Customer } from '../../entities/customer.entity';
import { PaymentTransaction, PaymentStatusType } from '../../entities/payment-transaction.entity';
import { DriverPayout, PayoutStatusType } from '../../entities/driver-payout.entity';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { Driver } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { RideRequestDispatch, DispatchStatusType } from '../../entities/ride-request-dispatch.entity';
import { Conversation } from '../../entities/conversation.entity';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RideGateway } from './ride.gateway';
import { calculatePayout } from '../../common/payout.util';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { PricingRule } from '../../entities/pricing-rule.entity';
import { MapService } from '../map/map.service';
import { calculateFareFromRules } from '../../common/pricing.util';
import { EstimateDto } from './dto/estimate.dto';

const DISPATCH_RADIUS_KM = 2;
const ENFORCE_DISPATCH_RADIUS_ON_ACCEPT = false;
const PENDING_REQUEST_FRESHNESS_MINUTES = 24 * 60;

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = radians(toLat - fromLat);
  const deltaLng = radians(toLng - fromLng);
  const startLat = radians(fromLat);
  const endLat = radians(toLat);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

@Injectable()
export class RideService {
  constructor(
    @InjectRepository(RideRequest)
    private readonly rideRequestRepo: Repository<RideRequest>,
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(DriverLocationHistory)
    private readonly driverLocationRepo: Repository<DriverLocationHistory>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(RideRequestDispatch)
    private readonly dispatchRepo: Repository<RideRequestDispatch>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(DriverPayout)
    private readonly driverPayoutRepo: Repository<DriverPayout>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(PricingRule)
    private readonly pricingRules: Repository<PricingRule>,
    private readonly rideGateway: RideGateway,
    private readonly dataSource: DataSource,
    private readonly maps: MapService,
  ) {}

  async estimate(dto: EstimateDto) {
    const route = await this.maps.route(
      dto.startLat,
      dto.startLng,
      dto.endLat,
      dto.endLng,
    );
    const distanceKm = route.distanceMeters / 1000;
    const rows = await this.pricingRules.find({
      where: {},
      order: { priority: 'ASC' },
    });
    if (!rows.length) throw new BadRequestException('Pricing rules are not configured');
    const rawFareVnd = calculateFareFromRules(
      distanceKm,
      rows.map((row) => ({
        startKm: Number(row.startKm),
        endKm: row.endKm == null ? null : Number(row.endKm),
        pricePerKmVnd: Number(row.pricePerKmVnd),
      })),
    );
    const serviceFeeVnd = 10_000;
    const totalFareVnd = rawFareVnd + serviceFeeVnd;
    const exchangeRateVndToJpy = 166.6667;
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      fareVnd: totalFareVnd,
      fareJpy: Math.round(totalFareVnd / exchangeRateVndToJpy),
      path: route.path,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.max(1, Math.round(route.durationSeconds / 60)),
      rawFareVnd,
      serviceFeeVnd,
      totalFareVnd,
      totalJpy: Math.round(totalFareVnd / exchangeRateVndToJpy),
      exchangeRateVndToJpy,
      routePath: route.path,
    };
  }

  /**
   * Tạo yêu cầu đặt xe mới
   */
  async createRequest(customerId: number, dto: CreateRideRequestDto): Promise<RideRequest> {
    // 1. Kiểm tra xem khách hàng có chuyến đi nào đang diễn ra (ongoing) không
    const activeTrip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('rideRequest.customerId = :customerId', { customerId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .getOne();

    if (activeTrip) {
      throw new BadRequestException('Please complete or cancel the active ride before booking another ride.');
    }

    // 2. Dọn các yêu cầu cũ chưa thành chuyến để lần đặt mới không bị kẹt ở bill-confirm.
    const activeRequest = await this.rideRequestRepo.findOne({
      where: {
        customerId,
        status: In([
          RideRequestStatusType.pending,
          RideRequestStatusType.searching,
          RideRequestStatusType.assigned,
        ]),
      },
      order: { requestTime: 'DESC' },
    });

    if (activeRequest) {
      throw new BadRequestException('Please cancel the active ride request before booking another ride.');
    }

    // 3. Khởi tạo yêu cầu mới
    const estimate = await this.estimate({
      startLat: dto.pickupLat,
      startLng: dto.pickupLng,
      endLat: dto.dropoffLat,
      endLng: dto.dropoffLng,
      vehicleType: dto.vehicleType,
    });

    const request = this.rideRequestRepo.create({
      customerId,
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat.toString(),
      pickupLng: dto.pickupLng.toString(),
      dropoffAddress: dto.dropoffAddress,
      dropoffLat: dto.dropoffLat.toString(),
      dropoffLng: dto.dropoffLng.toString(),
      vehicleType: dto.vehicleType,
      status: RideRequestStatusType.searching, // Bắt đầu tìm kiếm tài xế lân cận
      actualPassengerName: dto.actualPassengerName || null,
      actualPassengerPhone: dto.actualPassengerPhone || null,
      noteToDriver: dto.noteToDriver || null,
      estimatedFareVnd: estimate.fareVnd,
      estimatedFareJpy: estimate.fareJpy,
      rawFareVnd: estimate.rawFareVnd,
      requestTime: new Date(),
    });

    return this.rideRequestRepo.save(request);
  }

  /**
   * Lấy yêu cầu đặt xe hoặc chuyến đi đang hoạt động của khách hàng
   */
  async getActiveRide(customerId: number): Promise<any> {
    // 1. Tìm yêu cầu đặt xe hoạt động
    const activeRequest = await this.rideRequestRepo.findOne({
      where: {
        customerId,
        status: In([
          RideRequestStatusType.pending,
          RideRequestStatusType.searching,
          RideRequestStatusType.assigned,
        ]),
      },
    });

    if (activeRequest && activeRequest.status !== RideRequestStatusType.assigned) {
      return { type: 'request', data: activeRequest };
    }

    // 2. Tìm chuyến đi đang hoạt động (ongoing)
    const activeTrip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('rideRequest.customerId = :customerId', { customerId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .getOne();

    if (activeTrip) {
      const [driver, vehicle, latestLocation] = await Promise.all([
        this.driverRepo.findOne({ where: { driverId: activeTrip.driverId } }),
        this.vehicleRepo.findOne({ where: { driverId: activeTrip.driverId } }),
        this.driverLocationRepo.findOne({
          where: { driverId: activeTrip.driverId },
          order: { recordedAt: 'DESC' },
        }),
      ]);

      return {
        type: 'trip',
        data: {
          ...activeTrip,
          driver: driver
            ? {
                driverId: driver.driverId,
                name: [driver.lastName, driver.firstName].filter(Boolean).join(' '),
                phone: driver.phone,
                avatarUrl: driver.avatarUrl,
                japaneseLevel: driver.driverJapaneseLevel,
                location: latestLocation
                  ? {
                      latitude: Number(latestLocation.latitude),
                      longitude: Number(latestLocation.longitude),
                      recordedAt: latestLocation.recordedAt,
                    }
                  : null,
              }
            : null,
          vehicle: vehicle
            ? {
                vehicleId: vehicle.vehicleId,
                brand: vehicle.brand,
                color: vehicle.color,
                licensePlate: vehicle.licensePlate,
                vehicleType: vehicle.vehicleType,
                vehiclePhotoUrl: vehicle.vehiclePhotoUrl,
              }
            : null,
        },
        paymentRequested: Boolean(activeTrip.paymentRequestedAt),
      };
    }

    if (activeRequest) {
      return { type: 'request', data: activeRequest };
    }

    return null;
  }

  async getActiveRideForDriver(driverId: number): Promise<any> {
    const activeTrip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('trip.driver_id = :driverId', { driverId })
      .andWhere('trip.status = :status', { status: TripStatusType.ongoing })
      .getOne();

    if (!activeTrip) return null;

    const customer = await this.customerRepo.findOne({
      where: { customerId: activeTrip.rideRequest.customerId },
    });

    return {
      type: 'trip',
      data: {
        ...activeTrip,
        passenger: customer
          ? {
              customerId: customer.customerId,
              name: [customer.lastName, customer.firstName].filter(Boolean).join(' '),
              phone: customer.phone,
              avatarUrl: customer.avatarUrl,
            }
          : null,
      },
      paymentRequested: Boolean(activeTrip.paymentRequestedAt),
    };
  }

  private mapPendingRequestRow(row: Record<string, string | number | Date | null>) {
    return {
      requestId: Number(row.requestId),
      customerId: Number(row.customerId),
      pickupAddress: String(row.pickupAddress ?? ''),
      pickupLat: Number(row.pickupLat),
      pickupLng: Number(row.pickupLng),
      dropoffAddress: String(row.dropoffAddress ?? ''),
      dropoffLat: Number(row.dropoffLat),
      dropoffLng: Number(row.dropoffLng),
      vehicleType: String(row.vehicleType ?? ''),
      actualPassengerName: row.actualPassengerName ? String(row.actualPassengerName) : null,
      actualPassengerPhone: row.actualPassengerPhone ? String(row.actualPassengerPhone) : null,
      noteToDriver: row.noteToDriver ? String(row.noteToDriver) : null,
      requestTime: row.requestTime,
      distanceKm: row.distanceKm != null ? Math.round(Number(row.distanceKm) * 1000) / 1000 : null,
      customer: {
        name: [row.customerLastName, row.customerFirstName].filter(Boolean).join(' '),
        phone: String(row.customerPhone ?? ''),
        avatarUrl: row.customerAvatarUrl ? String(row.customerAvatarUrl) : null,
      },
    };
  }

  private async getPinnedPendingRequestForDriver(
    driverId: number,
    distanceSql?: string,
    parameters: Record<string, number | Date> = {},
  ) {
    const freshSince = new Date(Date.now() - PENDING_REQUEST_FRESHNESS_MINUTES * 60 * 1000);
    const query = this.rideRequestRepo
      .createQueryBuilder('rr')
      .innerJoin(Customer, 'c', 'c.customer_id = rr.customer_id')
      .innerJoin(
        RideRequestDispatch,
        'rrd',
        'rrd.request_id = rr.request_id AND rrd.driver_id = :driverId AND rrd.status = :dispatchStatus',
        { driverId, dispatchStatus: DispatchStatusType.pending },
      )
      .select([
        'rr.request_id AS "requestId"',
        'rr.customer_id AS "customerId"',
        'rr.pickup_address AS "pickupAddress"',
        'rr.pickup_lat AS "pickupLat"',
        'rr.pickup_lng AS "pickupLng"',
        'rr.dropoff_address AS "dropoffAddress"',
        'rr.dropoff_lat AS "dropoffLat"',
        'rr.dropoff_lng AS "dropoffLng"',
        'rr.vehicle_type AS "vehicleType"',
        'rr.actual_passenger_name AS "actualPassengerName"',
        'rr.actual_passenger_phone AS "actualPassengerPhone"',
        'rr.note_to_driver AS "noteToDriver"',
        'rr.request_time AS "requestTime"',
        'c.first_name AS "customerFirstName"',
        'c.last_name AS "customerLastName"',
        'c.phone AS "customerPhone"',
        'c.avatar_url AS "customerAvatarUrl"',
      ])
      .where('rr.status = :status', { status: RideRequestStatusType.searching })
      .andWhere('rr.request_time >= :freshSince', { freshSince })
      .orderBy('rrd.sent_at', 'DESC')
      .limit(1);

    if (distanceSql) {
      query.addSelect(`${distanceSql} AS "distanceKm"`).setParameters(parameters);
    }

    const row = await query.getRawOne<Record<string, string | number | Date | null>>();
    return row ? this.mapPendingRequestRow(row) : null;
  }

  private async pinPendingRequestForDriver(driverId: number, requestId: number) {
    const existing = await this.dispatchRepo.findOne({
      where: { requestId, driverId, status: DispatchStatusType.pending },
    });
    if (existing) return;

    await this.dispatchRepo.save(this.dispatchRepo.create({
      requestId,
      driverId,
      attemptNumber: 1,
      status: DispatchStatusType.pending,
      respondedAt: null,
    }));
  }

  async getPendingRequestForDriver(driverId: number): Promise<any> {
    const latestLocation = await this.driverLocationRepo.findOne({
      where: { driverId },
      order: { recordedAt: 'DESC' },
    });

    if (!latestLocation) {
      return {
        request: null,
        radiusKm: DISPATCH_RADIUS_KM,
        message: 'ドライバー位置情報がないため、近くの配車を検索できません。',
      };
    }

    const driverLat = Number(latestLocation.latitude);
    const driverLng = Number(latestLocation.longitude);
    const distanceSql = `(
      6371.0088 * acos(
        LEAST(1.0::double precision, GREATEST(-1.0::double precision,
          cos(radians(:driverLat::double precision))
          * cos(radians(rr.pickup_lat::double precision))
          * cos(radians(rr.pickup_lng::double precision) - radians(:driverLng::double precision))
          + sin(radians(:driverLat::double precision))
          * sin(radians(rr.pickup_lat::double precision))
        ))
      )
    )`;

    const pinnedRequest = await this.getPinnedPendingRequestForDriver(
      driverId,
      distanceSql,
      { driverLat, driverLng },
    );
    if (pinnedRequest) {
      return {
        radiusKm: DISPATCH_RADIUS_KM,
        driverLocation: {
          latitude: driverLat,
          longitude: driverLng,
          recordedAt: latestLocation.recordedAt,
        },
        request: pinnedRequest,
      };
    }

    const row = await this.rideRequestRepo
      .createQueryBuilder('rr')
      .innerJoin(Customer, 'c', 'c.customer_id = rr.customer_id')
      .select([
        'rr.request_id AS "requestId"',
        'rr.customer_id AS "customerId"',
        'rr.pickup_address AS "pickupAddress"',
        'rr.pickup_lat AS "pickupLat"',
        'rr.pickup_lng AS "pickupLng"',
        'rr.dropoff_address AS "dropoffAddress"',
        'rr.dropoff_lat AS "dropoffLat"',
        'rr.dropoff_lng AS "dropoffLng"',
        'rr.vehicle_type AS "vehicleType"',
        'rr.actual_passenger_name AS "actualPassengerName"',
        'rr.actual_passenger_phone AS "actualPassengerPhone"',
        'rr.note_to_driver AS "noteToDriver"',
        'rr.request_time AS "requestTime"',
        'c.first_name AS "customerFirstName"',
        'c.last_name AS "customerLastName"',
        'c.phone AS "customerPhone"',
        'c.avatar_url AS "customerAvatarUrl"',
        `${distanceSql} AS "distanceKm"`,
      ])
      .where('rr.status = :status', { status: RideRequestStatusType.searching })
      .andWhere(`${distanceSql} <= :radiusKm`, { radiusKm: DISPATCH_RADIUS_KM })
      .andWhere('rr.request_time >= :freshSince', {
        freshSince: new Date(Date.now() - PENDING_REQUEST_FRESHNESS_MINUTES * 60 * 1000),
      })
      .andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM ride_request_dispatch rrd
          WHERE rrd.request_id = rr.request_id
            AND rrd.driver_id = :excludedDriverId
            AND rrd.status IN (:...excludedDispatchStatuses)
        )`,
        {
          excludedDriverId: driverId,
          excludedDispatchStatuses: [DispatchStatusType.accepted, DispatchStatusType.rejected],
        },
      )
      .setParameters({ driverLat, driverLng })
      .orderBy(distanceSql, 'ASC')
      .addOrderBy('RANDOM()')
      .limit(1)
      .getRawOne<Record<string, string | number | Date | null>>();

    if (!row) {
      return {
        request: null,
        radiusKm: DISPATCH_RADIUS_KM,
        message: '半径2km以内の配車リクエストを検索しています。',
      };
    }

    await this.pinPendingRequestForDriver(driverId, Number(row.requestId));

    return {
      radiusKm: DISPATCH_RADIUS_KM,
      driverLocation: {
        latitude: driverLat,
        longitude: driverLng,
        recordedAt: latestLocation.recordedAt,
      },
      request: {
        requestId: Number(row.requestId),
        customerId: Number(row.customerId),
        pickupAddress: String(row.pickupAddress ?? ''),
        pickupLat: Number(row.pickupLat),
        pickupLng: Number(row.pickupLng),
        dropoffAddress: String(row.dropoffAddress ?? ''),
        dropoffLat: Number(row.dropoffLat),
        dropoffLng: Number(row.dropoffLng),
        vehicleType: String(row.vehicleType ?? ''),
        actualPassengerName: row.actualPassengerName ? String(row.actualPassengerName) : null,
        actualPassengerPhone: row.actualPassengerPhone ? String(row.actualPassengerPhone) : null,
        noteToDriver: row.noteToDriver ? String(row.noteToDriver) : null,
        requestTime: row.requestTime,
        distanceKm: row.distanceKm != null ? Math.round(Number(row.distanceKm) * 1000) / 1000 : null,
        customer: {
          name: [row.customerLastName, row.customerFirstName].filter(Boolean).join(' '),
          phone: String(row.customerPhone ?? ''),
          avatarUrl: row.customerAvatarUrl ? String(row.customerAvatarUrl) : null,
        },
      },
    };
  }

  async updateDriverLocation(driverId: number, lat: number, lng: number): Promise<any> {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Invalid driver location.');
    }

    const history = this.driverLocationRepo.create({
      driverId,
      latitude: lat.toString(),
      longitude: lng.toString(),
      recordedAt: new Date(),
    });
    await this.driverLocationRepo.save(history);

    return {
      driverId,
      latitude: lat,
      longitude: lng,
      recordedAt: history.recordedAt,
    };
  }

  async acceptRequest(driverId: number, requestId: number): Promise<any> {
    const request = await this.rideRequestRepo.findOne({ where: { requestId } });
    if (!request) {
      throw new NotFoundException('配車リクエストが見つかりません。');
    }

    if (request.status !== RideRequestStatusType.searching) {
      throw new BadRequestException('この配車リクエストはすでに処理されています。');
    }

    const freshSince = Date.now() - PENDING_REQUEST_FRESHNESS_MINUTES * 60 * 1000;
    if (new Date(request.requestTime).getTime() < freshSince) {
      throw new BadRequestException('この配車リクエストは有効期限が切れています。');
    }

    const latestLocation = await this.driverLocationRepo.findOne({
      where: { driverId },
      order: { recordedAt: 'DESC' },
    });
    if (latestLocation) {
      const pickupDistance = distanceKm(
        Number(latestLocation.latitude),
        Number(latestLocation.longitude),
        Number(request.pickupLat),
        Number(request.pickupLng),
      );

      if (ENFORCE_DISPATCH_RADIUS_ON_ACCEPT && pickupDistance > DISPATCH_RADIUS_KM) {
        throw new BadRequestException('半径2km以内の配車リクエストのみ承認できます。');
      }
    }

    const estimate = await this.estimate({
      startLat: Number(request.pickupLat),
      startLng: Number(request.pickupLng),
      endLat: Number(request.dropoffLat),
      endLng: Number(request.dropoffLng),
      vehicleType: request.vehicleType,
    });

    const claimResult = await this.rideRequestRepo.update(
      { requestId: request.requestId, status: RideRequestStatusType.searching },
      { status: RideRequestStatusType.assigned },
    );
    if (!claimResult.affected) {
      throw new BadRequestException('この配車リクエストは他のドライバーが承認しました。');
    }

    request.status = RideRequestStatusType.assigned;
    await this.dispatchRepo.save(this.dispatchRepo.create({
      requestId: request.requestId,
      driverId,
      attemptNumber: 1,
      status: DispatchStatusType.accepted,
      respondedAt: new Date(),
    }));

    const trip = this.tripRepo.create({
      rideRequest: request,
      driverId,
      startTime: new Date(),
      endTime: null,
      paymentRequestedAt: null,
      actualDistanceKm: (estimate.distanceMeters / 1000).toFixed(2),
      exchangeRateVndToJpy: estimate.exchangeRateVndToJpy.toFixed(4),
      finalFareVnd: estimate.fareVnd,
      finalFareJpy: estimate.fareJpy,
      rawFareVnd: estimate.rawFareVnd,
      status: TripStatusType.ongoing,
    });
    const savedTrip = await this.tripRepo.save(trip);
    await this.ensureRideConversation(request.customerId, driverId, request.requestId);

    const payload = {
      requestId: request.requestId,
      tripId: savedTrip.tripId,
      driverId,
      status: 'assigned',
    };
    this.rideGateway.emitToRequest(request.requestId, 'rideAccepted', payload);
    this.rideGateway.emitToUser(request.customerId, 'customer', 'rideAccepted', payload);

    return {
      ...payload,
      trip: savedTrip,
    };
  }

  private async ensureRideConversation(customerId: number, driverId: number, requestId: number) {
    let conversation = await this.conversationRepo.findOne({
      where: { customerId, driverId },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        customerId,
        driverId,
        requestId,
      });
    } else {
      conversation.requestId = requestId;
      conversation.updatedAt = new Date();
    }

    await this.conversationRepo.save(conversation);
  }

  async rejectPendingRequest(driverId: number, requestId: number): Promise<any> {
    const request = await this.rideRequestRepo.findOne({ where: { requestId } });
    if (!request) {
      throw new NotFoundException('配車リクエストが見つかりません。');
    }

    if (request.status !== RideRequestStatusType.searching) {
      return {
        requestId,
        driverId,
        status: 'ignored',
        message: 'この配車リクエストはすでに処理されています。',
      };
    }

    const existing = await this.dispatchRepo.findOne({
      where: { requestId, driverId, status: DispatchStatusType.rejected },
    });
    if (existing) {
      return { requestId, driverId, status: DispatchStatusType.rejected };
    }

    const pinned = await this.dispatchRepo.findOne({
      where: { requestId, driverId, status: DispatchStatusType.pending },
    });
    if (pinned) {
      pinned.status = DispatchStatusType.rejected;
      pinned.respondedAt = new Date();
      await this.dispatchRepo.save(pinned);
      return { requestId, driverId, status: DispatchStatusType.rejected };
    }

    await this.dispatchRepo.save(this.dispatchRepo.create({
      requestId,
      driverId,
      attemptNumber: 1,
      status: DispatchStatusType.rejected,
      respondedAt: new Date(),
    }));

    return { requestId, driverId, status: DispatchStatusType.rejected };
  }

  async requestPaymentFromDriver(driverId: number, tripId: number): Promise<any> {
    const trip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('trip.trip_id = :tripId', { tripId })
      .getOne();

    if (!trip) {
      throw new NotFoundException('対象の乗車が見つかりません。');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('この乗車の請求書を発行する権限がありません。');
    }

    if (trip.status !== TripStatusType.ongoing) {
      throw new BadRequestException('完了またはキャンセル済みの乗車には請求できません。');
    }

    const requestedAt = new Date();
    trip.paymentRequestedAt = requestedAt;
    await this.tripRepo.save(trip);
    this.rideGateway.emitToTrip(trip.tripId, 'paymentRequested', {
      tripId: trip.tripId,
      requestedAt: requestedAt.toISOString(),
    });
    this.rideGateway.emitToUser(trip.rideRequest.customerId, 'customer', 'paymentRequested', {
      tripId: trip.tripId,
      requestedAt: requestedAt.toISOString(),
    });

    return {
      tripId: trip.tripId,
      requestedAt: requestedAt.toISOString(),
      paymentRequested: true,
    };
  }

  async cancelAcceptedRideByDriver(driverId: number, tripId: number): Promise<any> {
    const trip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('trip.trip_id = :tripId', { tripId })
      .getOne();

    if (!trip) {
      throw new NotFoundException('対象の乗車が見つかりません。');
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('この乗車をキャンセルする権限がありません。');
    }

    if (trip.status !== TripStatusType.ongoing) {
      throw new BadRequestException('完了またはキャンセル済みの乗車はキャンセルできません。');
    }

    const oldRequest = trip.rideRequest;

    trip.status = TripStatusType.cancelled_by_admin;
    trip.endTime = new Date();
    trip.paymentRequestedAt = null;
    await this.tripRepo.save(trip);

    oldRequest.status = RideRequestStatusType.failed;
    await this.rideRequestRepo.save(oldRequest);

    const replacementRequest = this.rideRequestRepo.create({
      customerId: oldRequest.customerId,
      pickupAddress: oldRequest.pickupAddress,
      pickupLat: oldRequest.pickupLat,
      pickupLng: oldRequest.pickupLng,
      dropoffAddress: oldRequest.dropoffAddress,
      dropoffLat: oldRequest.dropoffLat,
      dropoffLng: oldRequest.dropoffLng,
      vehicleType: oldRequest.vehicleType,
      status: RideRequestStatusType.searching,
      actualPassengerName: oldRequest.actualPassengerName,
      actualPassengerPhone: oldRequest.actualPassengerPhone,
      noteToDriver: oldRequest.noteToDriver,
      estimatedFareVnd: oldRequest.estimatedFareVnd,
      estimatedFareJpy: oldRequest.estimatedFareJpy,
      rawFareVnd: oldRequest.rawFareVnd,
      requestTime: new Date(),
    });
    const savedReplacement = await this.rideRequestRepo.save(replacementRequest);
    await this.dispatchRepo.save(this.dispatchRepo.create({
      requestId: savedReplacement.requestId,
      driverId,
      attemptNumber: 1,
      status: DispatchStatusType.rejected,
      respondedAt: new Date(),
    }));

    const payload = {
      tripId: trip.tripId,
      oldRequestId: oldRequest.requestId,
      requestId: savedReplacement.requestId,
      driverId,
      status: 'driver_cancelled',
    };

    this.rideGateway.emitToTrip(trip.tripId, 'driverCancelledRide', payload);
    this.rideGateway.emitToUser(oldRequest.customerId, 'customer', 'driverCancelledRide', payload);

    return {
      ...payload,
      request: savedReplacement,
    };
  }

  /**
   * Hủy yêu cầu đặt xe đang hoạt động (khi chưa được tài xế nhận cuốc)
   */
  async cancelRequest(customerId: number, requestId: number): Promise<RideRequest> {
    const request = await this.rideRequestRepo.findOne({
      where: { requestId, customerId },
    });

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu đặt xe.');
    }

    if (
      request.status !== RideRequestStatusType.pending &&
      request.status !== RideRequestStatusType.searching
    ) {
      throw new BadRequestException('Không thể hủy yêu cầu đặt xe đã được gán hoặc đã hoàn thành.');
    }

    request.status = RideRequestStatusType.failed; // Chuyển trạng thái sang thất bại (đã hủy)
    return this.rideRequestRepo.save(request);
  }

  /**
   * Xử lý thanh toán chuyến đi
   */
  async processPaymentTransactional(customerId: number, dto: ProcessPaymentDto): Promise<any> {
    const result = await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(PaymentTransaction);
      const trip = await manager.getRepository(Trip)
        .createQueryBuilder('trip')
        .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
        .where('trip.trip_id = :tripId', { tripId: dto.tripId })
        .setLock('pessimistic_write')
        .getOne();
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.rideRequest.customerId !== customerId) {
        throw new ForbiddenException('You cannot pay for this trip');
      }

      const customer = await manager.getRepository(Customer)
        .createQueryBuilder('customer')
        .addSelect('customer.passwordHash')
        .where('customer.customer_id = :customerId', { customerId })
        .getOne();
      if (!customer || !(await bcrypt.compare(dto.password, customer.passwordHash))) {
        throw new BadRequestException('Confirmation password is incorrect');
      }

      const existingByKey = await paymentRepo.findOne({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existingByKey && existingByKey.tripId !== dto.tripId) {
        throw new BadRequestException('Idempotency key is already in use');
      }

      const existing = existingByKey ?? await paymentRepo.findOne({
        where: { tripId: dto.tripId },
      });
      if (existing) {
        return {
          tripId: existing.tripId,
          status: existing.status,
          transactionId: existing.gatewayTransactionId,
          paidAt: existing.paidAt,
          idempotent: true,
        };
      }

      if (trip.status !== TripStatusType.ongoing) {
        throw new BadRequestException('Trip is not payable');
      }

      let storedMethod: CustomerPaymentMethod | null = null;
      if (dto.paymentMethodId != null) {
        storedMethod = await manager.getRepository(CustomerPaymentMethod).findOne({
          where: { paymentMethodId: dto.paymentMethodId, customerId },
        });
        if (!storedMethod) throw new BadRequestException('Payment method not found');
        if (String(storedMethod.brand) !== String(dto.paymentMethod)) {
          throw new BadRequestException('Payment method does not match stored card');
        }
      }

      const paidAt = new Date();
      trip.status = TripStatusType.completed;
      trip.endTime = paidAt;
      trip.paymentRequestedAt = null;
      await manager.getRepository(Trip).save(trip);
      trip.rideRequest.status = RideRequestStatusType.completed;
      await manager.getRepository(RideRequest).save(trip.rideRequest);

      const transaction = await paymentRepo.save(paymentRepo.create({
        tripId: trip.tripId,
        paymentMethod: dto.paymentMethod,
        paymentMethodId: storedMethod?.paymentMethodId ?? null,
        amountVnd: trip.finalFareVnd,
        status: PaymentStatusType.success,
        gatewayTransactionId: `LOCAL-${randomUUID()}`,
        idempotencyKey: dto.idempotencyKey,
        paidAt,
      }));

      const bank = await manager.getRepository(DriverBankAccount).findOne({
        where: { driverId: trip.driverId },
      });
      const amounts = calculatePayout(trip.finalFareVnd, 20);
      const payoutRepo = manager.getRepository(DriverPayout);
      await payoutRepo.save(payoutRepo.create({
        tripId: trip.tripId,
        driverId: trip.driverId,
        grossFareVnd: amounts.grossFareVnd,
        commissionVnd: amounts.commissionVnd,
        amountVnd: amounts.netAmountVnd,
        status: bank ? PayoutStatusType.processed : PayoutStatusType.pending,
        bankAccountId: bank?.accountId ?? null,
        processedAt: bank ? paidAt : null,
      }));

      return {
        tripId: trip.tripId,
        status: 'completed',
        transactionId: transaction.gatewayTransactionId,
        paidAt,
        idempotent: false,
      };
    });

    if (!result.idempotent) {
      this.rideGateway.emitToTrip(dto.tripId, 'tripPaid', result);
    }
    return { message: 'Payment completed successfully', ...result };
  }

}
