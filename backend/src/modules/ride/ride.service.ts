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
import { validatePaymentMethodSelection } from '../../common/payment-method.util';
import { ConfigService } from '@nestjs/config';
import { RideSearchDriverExclusion } from '../../entities/ride-search-driver-exclusion.entity';
import {
  calculateSearchRadiusKm,
  isDispatchOfferExpired,
} from './dispatch-policy';

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
    @InjectRepository(RideSearchDriverExclusion)
    private readonly exclusionRepo: Repository<RideSearchDriverExclusion>,
    private readonly rideGateway: RideGateway,
    private readonly dataSource: DataSource,
    private readonly maps: MapService,
    private readonly config: ConfigService,
  ) {}

  private get dispatchInitialRadiusKm(): number {
    return this.config.get<number>('DISPATCH_INITIAL_RADIUS_KM', 2);
  }

  private get dispatchRadiusStepKm(): number {
    return this.config.get<number>('DISPATCH_RADIUS_STEP_KM', 1);
  }

  private get dispatchExpansionIntervalMs(): number {
    return this.config.get<number>('DISPATCH_EXPANSION_INTERVAL_MS', 2_000);
  }

  private get dispatchOfferTimeoutMs(): number {
    return this.config.get<number>('DISPATCH_OFFER_TIMEOUT_MS', 30_000);
  }

  private get dispatchLocationMaxAgeMinutes(): number {
    return this.config.get<number>('DISPATCH_LOCATION_MAX_AGE_MINUTES', 30);
  }

  private get dispatchSearchStaleMinutes(): number {
    return this.config.get<number>('DISPATCH_SEARCH_STALE_MINUTES', 2);
  }

  async processDispatchCycle(now = new Date()): Promise<void> {
    const events = await this.dataSource.transaction(async (manager) => {
      const emitted: Array<{
        target: 'customer' | 'driver';
        userId: number;
        event: string;
        payload: Record<string, unknown>;
      }> = [];
      const dispatches = manager.getRepository(RideRequestDispatch);
      const requests = manager.getRepository(RideRequest);
      const exclusions = manager.getRepository(RideSearchDriverExclusion);

      const expiredOffers = await dispatches
        .createQueryBuilder('dispatch')
        .setLock('pessimistic_write')
        .where('dispatch.status = :status', {
          status: DispatchStatusType.pending,
        })
        .andWhere('dispatch.expires_at IS NOT NULL')
        .andWhere('dispatch.expires_at <= :now', { now })
        .getMany();

      for (const offer of expiredOffers) {
        offer.status = DispatchStatusType.timeout;
        offer.respondedAt = now;
        await dispatches.save(offer);

        const request = await requests.findOne({
          where: { requestId: offer.requestId },
        });
        if (!request || request.status !== RideRequestStatusType.searching) {
          continue;
        }

        await exclusions
          .createQueryBuilder()
          .insert()
          .values({
            searchGroupId: request.searchGroupId,
            driverId: offer.driverId,
            requestId: request.requestId,
            reason: 'timeout',
          })
          .orIgnore()
          .execute();
        request.searchStartedAt = now;
        request.searchRadiusKm = this.dispatchInitialRadiusKm;
        await requests.save(request);

        const payload = {
          requestId: request.requestId,
          driverId: offer.driverId,
          radiusKm: request.searchRadiusKm,
          reason: 'timeout',
        };
        emitted.push(
          {
            target: 'driver',
            userId: offer.driverId,
            event: 'dispatchOfferExpired',
            payload,
          },
          {
            target: 'customer',
            userId: request.customerId,
            event: 'dispatchReset',
            payload,
          },
        );
      }

      const searchingRequests = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('request.status = :status', {
          status: RideRequestStatusType.searching,
        })
        .andWhere(
          `NOT EXISTS (
            SELECT 1
            FROM ride_request_dispatch active_dispatch
            WHERE active_dispatch.request_id = request.request_id
              AND active_dispatch.status = :pendingStatus
              AND active_dispatch.expires_at > :now
          )`,
          { pendingStatus: DispatchStatusType.pending, now },
        )
        .orderBy('request.request_time', 'ASC')
        .take(25)
        .getMany();

      for (const request of searchingRequests) {
        if (await this.failSearchRequestIfStale(request, now, manager)) {
          emitted.push({
            target: 'customer',
            userId: request.customerId,
            event: 'dispatchReset',
            payload: {
              requestId: request.requestId,
              status: 'search_failed',
            },
          });
          continue;
        }

        const elapsedMs = Math.max(
          0,
          now.getTime() - new Date(request.searchStartedAt).getTime(),
        );
        const radiusKm = calculateSearchRadiusKm(
          elapsedMs,
          this.dispatchInitialRadiusKm,
          this.dispatchRadiusStepKm,
          this.dispatchExpansionIntervalMs,
        );
        const radiusChanged = request.searchRadiusKm !== radiusKm;
        if (radiusChanged) {
          request.searchRadiusKm = radiusKm;
          await requests.save(request);
          emitted.push({
            target: 'customer',
            userId: request.customerId,
            event: 'dispatchRadiusUpdated',
            payload: { requestId: request.requestId, radiusKm },
          });
        }

        const locationFreshSince = new Date(
          now.getTime() - this.dispatchLocationMaxAgeMinutes * 60_000,
        );
        const candidateRows = await manager.query<
          Array<{ driverId: number | string; distanceKm: number | string }>
        >(
          `
            SELECT
              driver.driver_id AS "driverId",
              (
                6371.0088 * acos(
                  LEAST(1.0::double precision, GREATEST(-1.0::double precision,
                    cos(radians($1::double precision))
                    * cos(radians(location.latitude::double precision))
                    * cos(
                      radians(location.longitude::double precision)
                      - radians($2::double precision)
                    )
                    + sin(radians($1::double precision))
                    * sin(radians(location.latitude::double precision))
                  ))
                )
              ) AS "distanceKm"
            FROM driver
            INNER JOIN vehicle
              ON vehicle.driver_id = driver.driver_id
             AND vehicle.vehicle_type = $3
            INNER JOIN LATERAL (
              SELECT latitude, longitude, recorded_at
              FROM driver_location_history
              WHERE driver_id = driver.driver_id
              ORDER BY recorded_at DESC
              LIMIT 1
            ) location ON TRUE
            WHERE driver.status = 'approved'
              AND driver.is_online = TRUE
              AND location.recorded_at >= $4
              AND NOT EXISTS (
                SELECT 1
                FROM trip
                WHERE trip.driver_id = driver.driver_id
                  AND trip.status = 'ongoing'
              )
              AND NOT EXISTS (
                SELECT 1
                FROM ride_request_dispatch pending_offer
                WHERE pending_offer.driver_id = driver.driver_id
                  AND pending_offer.status = 'pending'
                  AND pending_offer.expires_at > $5
              )
              AND NOT EXISTS (
                SELECT 1
                FROM ride_search_driver_exclusion exclusion
                WHERE exclusion.search_group_id = $6
                  AND exclusion.driver_id = driver.driver_id
              )
              AND (
                6371.0088 * acos(
                  LEAST(1.0::double precision, GREATEST(-1.0::double precision,
                    cos(radians($1::double precision))
                    * cos(radians(location.latitude::double precision))
                    * cos(
                      radians(location.longitude::double precision)
                      - radians($2::double precision)
                    )
                    + sin(radians($1::double precision))
                    * sin(radians(location.latitude::double precision))
                  ))
                )
              ) <= $7
            ORDER BY "distanceKm" ASC, driver.driver_id ASC
            FOR UPDATE OF driver SKIP LOCKED
            LIMIT 1
          `,
          [
            Number(request.pickupLat),
            Number(request.pickupLng),
            request.vehicleType,
            locationFreshSince,
            now,
            request.searchGroupId,
            radiusKm,
          ],
        );

        const candidate = candidateRows[0];
        if (!candidate) continue;

        const attemptRow = await dispatches
          .createQueryBuilder('dispatch')
          .select('COALESCE(MAX(dispatch.attemptNumber), 0)', 'max')
          .where('dispatch.requestId = :requestId', {
            requestId: request.requestId,
          })
          .getRawOne<{ max: string | number }>();
        const expiresAt = new Date(now.getTime() + this.dispatchOfferTimeoutMs);
        await dispatches.save(
          dispatches.create({
            requestId: request.requestId,
            driverId: Number(candidate.driverId),
            attemptNumber: Number(attemptRow?.max ?? 0) + 1,
            status: DispatchStatusType.pending,
            respondedAt: null,
            expiresAt,
            radiusKm,
          }),
        );

        const payload = {
          requestId: request.requestId,
          radiusKm,
          offerExpiresAt: expiresAt.toISOString(),
          distanceKm: Math.round(Number(candidate.distanceKm) * 1000) / 1000,
        };
        emitted.push(
          {
            target: 'driver',
            userId: Number(candidate.driverId),
            event: 'dispatchOfferCreated',
            payload,
          },
          {
            target: 'customer',
            userId: request.customerId,
            event: 'dispatchOfferCreated',
            payload,
          },
        );
      }

      return emitted;
    });

    for (const event of events) {
      this.rideGateway.emitToUser(
        event.userId,
        event.target,
        event.event,
        event.payload,
      );
    }
  }

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

    if (
      activeRequest
      && !(await this.failSearchRequestIfStale(activeRequest))
    ) {
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
      estimatedDistanceMeters: Math.round(estimate.distanceMeters),
      estimatedDurationSeconds: Math.round(estimate.durationSeconds),
      requestTime: new Date(),
      searchStartedAt: new Date(),
      searchRadiusKm: this.dispatchInitialRadiusKm,
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

    if (
      activeRequest
      && activeRequest.status !== RideRequestStatusType.assigned
      && !(await this.failSearchRequestIfStale(activeRequest))
    ) {
      const offer = await this.dispatchRepo.findOne({
        where: {
          requestId: activeRequest.requestId,
          status: DispatchStatusType.pending,
        },
        order: { sentAt: 'DESC' },
      });
      const hasActiveOffer = Boolean(
        offer?.expiresAt && !isDispatchOfferExpired(offer.expiresAt),
      );
      const diagnostic = hasActiveOffer
        ? null
        : await this.getDispatchDiagnostic(activeRequest);
      return {
        type: 'request',
        data: activeRequest,
        dispatch: {
          phase: hasActiveOffer ? 'waiting_driver' : 'expanding',
          radiusKm: activeRequest.searchRadiusKm,
          offerExpiresAt: hasActiveOffer
            ? offer?.expiresAt?.toISOString()
            : null,
          diagnostic,
        },
      };
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
      return {
        type: 'request',
        data: activeRequest,
        dispatch: {
          phase: 'expanding',
          radiusKm: activeRequest.searchRadiusKm,
          offerExpiresAt: null,
        },
      };
    }

    return null;
  }

  private async getDispatchDiagnostic(
    request: RideRequest,
  ): Promise<string> {
    const freshSince = new Date(
      Date.now() - this.dispatchLocationMaxAgeMinutes * 60_000,
    );
    const [counts] = await this.dataSource.query<Array<{
      approved: string;
      online: string;
      fresh: string;
    }>>(
      `
        SELECT
          COUNT(*) FILTER (WHERE driver.status = 'approved') AS approved,
          COUNT(*) FILTER (
            WHERE driver.status = 'approved' AND driver.is_online = TRUE
          ) AS online,
          COUNT(*) FILTER (
            WHERE driver.status = 'approved'
              AND driver.is_online = TRUE
              AND location.recorded_at >= $2
          ) AS fresh
        FROM driver
        INNER JOIN vehicle
          ON vehicle.driver_id = driver.driver_id
         AND vehicle.vehicle_type = $1
        LEFT JOIN LATERAL (
          SELECT recorded_at
          FROM driver_location_history
          WHERE driver_id = driver.driver_id
          ORDER BY recorded_at DESC
          LIMIT 1
        ) location ON TRUE
      `,
      [request.vehicleType, freshSince],
    );
    if (Number(counts?.approved ?? 0) === 0) return 'no_approved_driver';
    if (Number(counts?.online ?? 0) === 0) return 'no_online_driver';
    if (Number(counts?.fresh ?? 0) === 0) return 'no_fresh_location';
    return 'no_available_driver_in_radius';
  }

  private isSearchRequestStale(request: RideRequest, now = new Date()): boolean {
    const startedAt = new Date(request.searchStartedAt).getTime();
    const staleAfterMs = this.dispatchSearchStaleMinutes * 60_000;
    return now.getTime() - startedAt >= staleAfterMs;
  }

  private async failSearchRequestIfStale(
    request: RideRequest,
    now = new Date(),
    manager?: DataSource['manager'],
  ): Promise<boolean> {
    if (
      request.status !== RideRequestStatusType.searching
      || !this.isSearchRequestStale(request, now)
    ) {
      return false;
    }

    const requests = manager?.getRepository(RideRequest) ?? this.rideRequestRepo;
    const dispatches = manager?.getRepository(RideRequestDispatch) ?? this.dispatchRepo;
    const activeOffer = await dispatches.findOne({
      where: {
        requestId: request.requestId,
        status: DispatchStatusType.pending,
      },
      order: { sentAt: 'DESC' },
    });

    if (activeOffer?.expiresAt && !isDispatchOfferExpired(activeOffer.expiresAt, now)) {
      return false;
    }

    request.status = RideRequestStatusType.failed;
    await requests.save(request);
    return true;
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

  async getPendingRequestForDriver(driverId: number): Promise<any> {
    await this.processDispatchCycle();
    const row = await this.rideRequestRepo
      .createQueryBuilder('rr')
      .innerJoin(Customer, 'c', 'c.customer_id = rr.customer_id')
      .innerJoin(
        RideRequestDispatch,
        'rrd',
        `rrd.request_id = rr.request_id
          AND rrd.driver_id = :driverId
          AND rrd.status = :dispatchStatus
          AND rrd.expires_at > :now`,
        {
          driverId,
          dispatchStatus: DispatchStatusType.pending,
          now: new Date(),
        },
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
        'rrd.radius_km AS "radiusKm"',
        'rrd.expires_at AS "offerExpiresAt"',
        `(
          SELECT 6371.0088 * acos(
            LEAST(1.0::double precision, GREATEST(-1.0::double precision,
              cos(radians(rr.pickup_lat::double precision))
              * cos(radians(location.latitude::double precision))
              * cos(
                radians(location.longitude::double precision)
                - radians(rr.pickup_lng::double precision)
              )
              + sin(radians(rr.pickup_lat::double precision))
              * sin(radians(location.latitude::double precision))
            ))
          )
          FROM driver_location_history location
          WHERE location.driver_id = rrd.driver_id
          ORDER BY location.recorded_at DESC
          LIMIT 1
        ) AS "distanceKm"`,
      ])
      .where('rr.status = :status', { status: RideRequestStatusType.searching })
      .orderBy('rrd.sent_at', 'DESC')
      .limit(1)
      .getRawOne<Record<string, string | number | Date | null>>();

    if (!row) {
      return {
        request: null,
        message: 'No dispatch offer is assigned to this driver.',
      };
    }

    return {
      radiusKm: Number(row.radiusKm),
      offerExpiresAt: row.offerExpiresAt,
      request: this.mapPendingRequestRow(row),
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
    const requestSnapshot = await this.rideRequestRepo.findOne({
      where: { requestId },
    });
    if (!requestSnapshot) {
      throw new NotFoundException('配車リクエストが見つかりません。');
    }
    const offerSnapshot = await this.dispatchRepo.findOne({
      where: {
        requestId,
        driverId,
        status: DispatchStatusType.pending,
      },
      order: { attemptNumber: 'DESC' },
    });
    if (!offerSnapshot) {
      throw new BadRequestException(
        'This ride request is not assigned to the current driver.',
      );
    }
    if (
      !offerSnapshot.expiresAt
      || isDispatchOfferExpired(offerSnapshot.expiresAt)
    ) {
      await this.processDispatchCycle();
      throw new BadRequestException('This dispatch offer has expired.');
    }

    const estimate = requestSnapshot.estimatedDistanceMeters != null
      && requestSnapshot.estimatedDurationSeconds != null
      && requestSnapshot.estimatedFareVnd != null
      && requestSnapshot.estimatedFareJpy != null
      ? {
          distanceMeters: requestSnapshot.estimatedDistanceMeters,
          durationSeconds: requestSnapshot.estimatedDurationSeconds,
          fareVnd: requestSnapshot.estimatedFareVnd,
          fareJpy: requestSnapshot.estimatedFareJpy,
          rawFareVnd: requestSnapshot.rawFareVnd ?? requestSnapshot.estimatedFareVnd,
          exchangeRateVndToJpy: 166.6667,
        }
      : await this.estimate({
          startLat: Number(requestSnapshot.pickupLat),
          startLng: Number(requestSnapshot.pickupLng),
          endLat: Number(requestSnapshot.dropoffLat),
          endLng: Number(requestSnapshot.dropoffLng),
          vehicleType: requestSnapshot.vehicleType,
        });
    const accepted = await this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(RideRequest);
      const dispatches = manager.getRepository(RideRequestDispatch);
      const trips = manager.getRepository(Trip);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.request_id = :requestId', { requestId })
        .getOne();
      if (!request) {
        throw new NotFoundException('配車リクエストが見つかりません。');
      }
      if (request.status !== RideRequestStatusType.searching) {
        throw new BadRequestException(
          'この配車リクエストはすでに処理されています。',
        );
      }

      const offer = await dispatches
        .createQueryBuilder('dispatch')
        .setLock('pessimistic_write')
        .where('dispatch.request_id = :requestId', { requestId })
        .andWhere('dispatch.driver_id = :driverId', { driverId })
        .andWhere('dispatch.status = :status', {
          status: DispatchStatusType.pending,
        })
        .orderBy('dispatch.attempt_number', 'DESC')
        .getOne();
      if (
        !offer?.expiresAt
        || isDispatchOfferExpired(offer.expiresAt)
      ) {
        throw new BadRequestException('This dispatch offer has expired.');
      }

      request.status = RideRequestStatusType.assigned;
      await requests.save(request);
      offer.status = DispatchStatusType.accepted;
      offer.respondedAt = new Date();
      await dispatches.save(offer);

      const trip = await trips.save(
        trips.create({
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
        }),
      );
      return { request, trip };
    });
    await this.ensureRideConversation(
      accepted.request.customerId,
      driverId,
      accepted.request.requestId,
    );

    const payload = {
      requestId: accepted.request.requestId,
      tripId: accepted.trip.tripId,
      driverId,
      status: 'assigned',
    };
    this.rideGateway.emitToRequest(
      accepted.request.requestId,
      'rideAccepted',
      payload,
    );
    this.rideGateway.emitToUser(
      accepted.request.customerId,
      'customer',
      'rideAccepted',
      payload,
    );
    this.rideGateway.emitToUser(driverId, 'driver', 'rideAccepted', payload);

    return {
      ...payload,
      trip: accepted.trip,
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
    const now = new Date();
    const result = await this.dataSource.transaction(async (manager) => {
      const requests = manager.getRepository(RideRequest);
      const dispatches = manager.getRepository(RideRequestDispatch);
      const exclusions = manager.getRepository(RideSearchDriverExclusion);
      const request = await requests
        .createQueryBuilder('request')
        .setLock('pessimistic_write')
        .where('request.request_id = :requestId', { requestId })
        .getOne();
      if (!request) {
        throw new NotFoundException('配車リクエストが見つかりません。');
      }
      if (request.status !== RideRequestStatusType.searching) {
        return { request, status: 'ignored' };
      }

      const offer = await dispatches.findOne({
        where: {
          requestId,
          driverId,
          status: DispatchStatusType.pending,
        },
        order: { attemptNumber: 'DESC' },
      });
      if (!offer) {
        throw new BadRequestException(
          'This ride request is not assigned to the current driver.',
        );
      }

      offer.status = DispatchStatusType.rejected;
      offer.respondedAt = now;
      await dispatches.save(offer);
      await exclusions
        .createQueryBuilder()
        .insert()
        .values({
          searchGroupId: request.searchGroupId,
          driverId,
          requestId,
          reason: 'rejected',
        })
        .orIgnore()
        .execute();

      request.searchStartedAt = now;
      request.searchRadiusKm = this.dispatchInitialRadiusKm;
      await requests.save(request);
      return { request, status: DispatchStatusType.rejected };
    });

    const payload = {
      requestId,
      driverId,
      status: result.status,
      radiusKm: result.request.searchRadiusKm,
    };
    this.rideGateway.emitToUser(
      driverId,
      'driver',
      'dispatchOfferRejected',
      payload,
    );
    this.rideGateway.emitToUser(
      result.request.customerId,
      'customer',
      'dispatchReset',
      payload,
    );
    return payload;
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
    const cancelledAt = new Date();
    const result = await this.dataSource.transaction(async (manager) => {
      const trips = manager.getRepository(Trip);
      const requests = manager.getRepository(RideRequest);
      const exclusions = manager.getRepository(RideSearchDriverExclusion);
      const trip = await trips
        .createQueryBuilder('trip')
        .innerJoinAndSelect('trip.rideRequest', 'rideRequest')
        .setLock('pessimistic_write')
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
      trip.endTime = cancelledAt;
      trip.paymentRequestedAt = null;
      await trips.save(trip);

      oldRequest.status = RideRequestStatusType.failed;
      await requests.save(oldRequest);

      const savedReplacement = await requests.save(requests.create({
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
        requestTime: cancelledAt,
        searchGroupId: oldRequest.searchGroupId,
        searchStartedAt: cancelledAt,
        searchRadiusKm: this.dispatchInitialRadiusKm,
      }));
      await exclusions
        .createQueryBuilder()
        .insert()
        .values({
          searchGroupId: oldRequest.searchGroupId,
          driverId,
          requestId: savedReplacement.requestId,
          reason: 'cancelled_after_accept',
        })
        .orIgnore()
        .execute();

      return { oldRequest, trip, savedReplacement };
    });

    const payload = {
      tripId: result.trip.tripId,
      oldRequestId: result.oldRequest.requestId,
      requestId: result.savedReplacement.requestId,
      driverId,
      status: 'driver_cancelled',
    };

    this.rideGateway.emitToTrip(result.trip.tripId, 'driverCancelledRide', payload);
    this.rideGateway.emitToUser(result.oldRequest.customerId, 'customer', 'driverCancelledRide', payload);
    this.rideGateway.emitToUser(result.oldRequest.customerId, 'customer', 'dispatchReset', {
      ...payload,
      radiusKm: result.savedReplacement.searchRadiusKm,
    });

    return {
      ...payload,
      request: result.savedReplacement,
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
    const saved = await this.rideRequestRepo.save(request);
    const offers = await this.dispatchRepo.find({
      where: {
        requestId,
        status: DispatchStatusType.pending,
      },
    });
    const now = new Date();
    for (const offer of offers) {
      offer.status = DispatchStatusType.timeout;
      offer.respondedAt = now;
    }
    if (offers.length) await this.dispatchRepo.save(offers);
    const payload = { requestId, status: 'customer_cancelled' };
    offers.forEach((offer) =>
      this.rideGateway.emitToUser(
        offer.driverId,
        'driver',
        'rideRequestCancelled',
        payload,
      ),
    );
    return saved;
  }

  /**
   * Xử lý thanh toán chuyến đi
   */
  async processPaymentTransactional(customerId: number, dto: ProcessPaymentDto): Promise<any> {
    try {
      validatePaymentMethodSelection(dto.paymentMethod, dto.paymentMethodId);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid payment method',
      );
    }

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
      if (!trip.paymentRequestedAt) {
        throw new BadRequestException(
          'The driver has not requested payment for this trip.',
        );
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
