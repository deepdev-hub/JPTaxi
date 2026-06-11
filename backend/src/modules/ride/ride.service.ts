import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
import { calculateRideFare } from '../../common/ride-fare.util';

const DISPATCH_RADIUS_KM = 2;
const ENFORCE_DISPATCH_RADIUS_ON_ACCEPT = false;
const PENDING_REQUEST_FRESHNESS_MINUTES = 24 * 60;

function distanceKm(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  return (
    Math.sqrt(
      Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2),
    ) * 111
  );
}

@Injectable()
export class RideService {
  private readonly paymentRequests = new Map<number, number>();

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
    private readonly rideGateway: RideGateway,
  ) {}

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
      estimatedFareVnd: dto.estimatedFareVnd ?? null,
      estimatedFareJpy: dto.estimatedFareJpy ?? null,
      rawFareVnd: dto.rawFareVnd ?? null,
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
        paymentRequested: this.isPaymentRequested(activeTrip.tripId),
      };
    }

    if (activeRequest) {
      return { type: 'request', data: activeRequest };
    }

    return null;
  }

  private isPaymentRequested(tripId: number): boolean {
    return this.paymentRequests.has(tripId);
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
      paymentRequested: this.isPaymentRequested(activeTrip.tripId),
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

  private pendingRequestQuery(driverId?: number) {
    const freshSince = new Date(Date.now() - PENDING_REQUEST_FRESHNESS_MINUTES * 60 * 1000);
    const query = this.rideRequestRepo
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
      ])
      .where('rr.status = :status', { status: RideRequestStatusType.searching })
      .andWhere('rr.request_time >= :freshSince', { freshSince })
      .orderBy('rr.request_time', 'DESC')
      .limit(1);

    if (driverId) {
      query.andWhere(
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
      );
    }

    return query;
  }

  private async getFallbackPendingRequest(
    distanceSql?: string,
    parameters: Record<string, number | Date> = {},
    driverId?: number,
  ) {
    const query = this.pendingRequestQuery(driverId);
    if (distanceSql) {
      query.addSelect(`${distanceSql} AS "distanceKm"`).setParameters(parameters);
    }

    const row = await query.getRawOne<Record<string, string | number | Date | null>>();
    return row ? this.mapPendingRequestRow(row) : null;
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
      const pinnedRequest = await this.getPinnedPendingRequestForDriver(driverId);
      if (pinnedRequest) {
        return {
          radiusKm: DISPATCH_RADIUS_KM,
          driverLocation: null,
          request: pinnedRequest,
        };
      }

      const request = await this.getFallbackPendingRequest(undefined, {}, driverId);
      if (request) {
        await this.pinPendingRequestForDriver(driverId, request.requestId);
        return {
          radiusKm: DISPATCH_RADIUS_KM,
          driverLocation: null,
          request,
        };
      }

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
      const fallbackRequest = await this.getFallbackPendingRequest(distanceSql, { driverLat, driverLng }, driverId);
      if (fallbackRequest) {
        await this.pinPendingRequestForDriver(driverId, fallbackRequest.requestId);
        return {
          radiusKm: DISPATCH_RADIUS_KM,
          driverLocation: {
            latitude: driverLat,
            longitude: driverLng,
            recordedAt: latestLocation.recordedAt,
          },
          request: fallbackRequest,
        };
      }

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

    const routeDistance = distanceKm(
      Number(request.pickupLat),
      Number(request.pickupLng),
      Number(request.dropoffLat),
      Number(request.dropoffLng),
    );
    const fallbackFare = calculateRideFare(routeDistance);
    const fareVnd = request.estimatedFareVnd ?? fallbackFare.totalFareVnd;
    const fareJpy = request.estimatedFareJpy ?? fallbackFare.totalJpy;
    const rawFareVnd = request.rawFareVnd ?? fallbackFare.rawFareVnd;

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
      actualDistanceKm: routeDistance.toFixed(2),
      exchangeRateVndToJpy: '160.0000',
      finalFareVnd: fareVnd,
      finalFareJpy: fareJpy,
      rawFareVnd,
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

    const requestedAt = Date.now();
    this.paymentRequests.set(trip.tripId, requestedAt);
    this.rideGateway.emitToTrip(trip.tripId, 'paymentRequested', {
      tripId: trip.tripId,
      requestedAt,
    });
    this.rideGateway.emitToUser(trip.rideRequest.customerId, 'customer', 'paymentRequested', {
      tripId: trip.tripId,
      requestedAt,
    });

    return {
      tripId: trip.tripId,
      requestedAt,
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
    await this.tripRepo.save(trip);
    this.paymentRequests.delete(trip.tripId);

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
  async processPayment(customerId: number, dto: ProcessPaymentDto): Promise<any> {
    // 1. Kiểm tra chuyến đi có tồn tại không và lấy thông tin chi tiết
    const trip = await this.tripRepo
      .createQueryBuilder('trip')
      .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
      .where('trip.trip_id = :tripId', { tripId: dto.tripId })
      .getOne();

    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi tương ứng.');
    }

    if (trip.rideRequest.customerId !== customerId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho chuyến đi này.');
    }

    if (trip.status !== TripStatusType.ongoing) {
      throw new BadRequestException('Chuyến đi này đã được thanh toán hoặc đã hủy.');
    }

    // 2. Xác thực mật khẩu khách hàng ("Check mật khẩu")
    const customer = await this.customerRepo
      .createQueryBuilder('customer')
      .addSelect('customer.passwordHash') // Phải addSelect vì mật khẩu mặc định select: false
      .where('customer.customer_id = :customerId', { customerId })
      .getOne();

    if (!customer) {
      throw new NotFoundException('Không tìm thấy thông tin khách hàng.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, customer.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu xác nhận không chính xác.');
    }

    // 3. Cập nhật trạng thái chuyến đi thành hoàn thành
    trip.status = TripStatusType.completed;
    trip.endTime = new Date();
    await this.tripRepo.save(trip);
    this.paymentRequests.delete(trip.tripId);

    // Cập nhật trạng thái yêu cầu đặt xe sang hoàn thành
    const rideRequest = trip.rideRequest;
    rideRequest.status = RideRequestStatusType.completed;
    await this.rideRequestRepo.save(rideRequest);

    // 4. Tạo bản ghi giao dịch trong bảng `payment_transaction`
    const transaction = this.paymentTransactionRepo.create({
      tripId: trip.tripId,
      paymentMethod: dto.paymentMethod,
      amountVnd: trip.finalFareVnd,
      status: PaymentStatusType.success,
      gatewayTransactionId: 'TXN_' + Math.random().toString(36).substring(2, 11).toUpperCase(),
      paidAt: new Date(),
    });
    await this.paymentTransactionRepo.save(transaction);

    // 5. Tạo dòng tiền chi trả tài xế trong bảng `driver_payout`
    const payout = this.driverPayoutRepo.create({
      tripId: trip.tripId,
      driverId: trip.driverId,
      amountVnd: trip.finalFareVnd,
      status: PayoutStatusType.processed,
      processedAt: new Date(),
    });
    await this.driverPayoutRepo.save(payout);

    // 6. Phát tín hiệu real-time qua Socket.io thông báo thanh toán thành công
    // Sự kiện 'tripPaid' sẽ kích hoạt Frontend tự động điều hướng khách hàng sang màn đánh giá tài xế
    this.rideGateway.emitToTrip(trip.tripId, 'tripPaid', {
      tripId: trip.tripId,
      status: 'completed',
      finalFareVnd: trip.finalFareVnd,
      finalFareJpy: trip.finalFareJpy,
      paymentMethod: dto.paymentMethod,
      paidAt: transaction.paidAt,
    });

    return {
      message: 'Thanh toán thành công.',
      tripId: trip.tripId,
      status: 'completed',
      transactionId: transaction.gatewayTransactionId,
      paidAt: transaction.paidAt,
    };
  }
}
