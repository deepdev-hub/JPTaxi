import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverJapaneseLevelEnum, DriverStatusType } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverLicense } from '../../entities/driver-license.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { DriverSearchSort, SearchDriversQueryDto } from './dto/search-drivers.query.dto';
import {
  buildNoDriversNotification,
  DriverSearchNotification,
} from './driver-search.messages';

import { ApplyDriverDto } from './dto/apply-driver.dto';
import { LicenseTypeEnum } from '../../entities/driver-license.entity';
import { VehicleTypeEnum } from '../../entities/vehicle.entity';
import { DriverPayout } from '../../entities/driver-payout.entity';

const JAPANESE_LEVEL_RANK: Record<DriverJapaneseLevelEnum, number> = {
  [DriverJapaneseLevelEnum.N5]: 1,
  [DriverJapaneseLevelEnum.N4]: 2,
  [DriverJapaneseLevelEnum.N3]: 3,
  [DriverJapaneseLevelEnum.N2]: 4,
  [DriverJapaneseLevelEnum.N1]: 5,
  [DriverJapaneseLevelEnum.Native]: 6,
};

/** Khoảng cách (km) từ điểm tìm kiếm tới vị trí mới nhất của tài xế (Haversine). */
const HAVERSINE_KM_SQL = `(
  6371.0088 * acos(
    LEAST(1.0::double precision, GREATEST(-1.0::double precision,
      cos(radians(:searchLat::double precision))
      * cos(radians(latest.lat::double precision))
      * cos(radians(latest.lng::double precision) - radians(:searchLng::double precision))
      + sin(radians(:searchLat::double precision))
      * sin(radians(latest.lat::double precision))
    ))
  )
)`;

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(DriverLicense)
    private readonly licenses: Repository<DriverLicense>,
    @InjectRepository(DriverBankAccount)
    private readonly banks: Repository<DriverBankAccount>,
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    @InjectRepository(DriverPayout)
    private readonly payouts: Repository<DriverPayout>,
  ) {}

  private mapTripStatus(s: TripStatusType): string {
    if (s === TripStatusType.completed) return 'completed';
    if (s === TripStatusType.ongoing) return 'ongoing';
    return 'cancelled';
  }

  async getProfileByEmail(email: string) {
    const normalized = String(email ?? '').trim().toLowerCase();
    if (!normalized) throw new NotFoundException();
    const d = await this.drivers.findOne({ where: { email: normalized } });
    if (!d) throw new NotFoundException();
    return this.getProfile(d.driverId);
  }

  async getProfile(driverId: number) {
    const d = await this.drivers.findOne({ where: { driverId } });
    if (!d) throw new NotFoundException();

    const vehicle = await this.vehicles.findOne({ where: { driverId } });
    const licenseRows = await this.licenses.find({ where: { driverId } });
    const primaryLicense = licenseRows[0] ?? null;
    const bank = await this.banks.findOne({ where: { driverId } });
    const tripRows = await this.trips.find({
      where: { driverId },
      relations: ['rideRequest'],
      order: { startTime: 'DESC' },
      take: 20,
    });
    const countedTripQb = this.trips
      .createQueryBuilder('t')
      .where('t.driver_id = :driverId', { driverId })
      .andWhere('t.status != :cancelledStatus', { cancelledStatus: TripStatusType.cancelled_by_admin });
    const completedTrips = await countedTripQb.getCount();
    const salesRow = await this.trips
      .createQueryBuilder('t')
      .select('COALESCE(SUM(t.final_fare_jpy), 0)', 'totalSalesJpy')
      .where('t.driver_id = :driverId', { driverId })
      .andWhere('t.status != :cancelledStatus', { cancelledStatus: TripStatusType.cancelled_by_admin })
      .getRawOne<{ totalSalesJpy: string | number | null }>();
    const totalSalesJpy = Number(salesRow?.totalSalesJpy ?? 0);
    const ratingStatsRow = await this.trips
      .createQueryBuilder('t')
      .innerJoin('rating', 'r', 'r.trip_id = t.trip_id')
      .select('AVG(r.score)::float', 'averageRating')
      .addSelect('COUNT(*)::int', 'ratingCount')
      .where('t.driver_id = :driverId', { driverId })
      .getRawOne<{ averageRating: string | number | null; ratingCount: string | number | null }>();
    const ratingCount = Number(ratingStatsRow?.ratingCount ?? 0);
    const averageRating =
      ratingStatsRow?.averageRating != null
        ? Math.round(Number(ratingStatsRow.averageRating) * 100) / 100
        : null;
    const ratingRows = await this.trips
      .createQueryBuilder('t')
      .innerJoin('rating', 'r', 'r.trip_id = t.trip_id')
      .select('r.trip_id', 'tripId')
      .addSelect('r.score', 'score')
      .addSelect('r.comment', 'comment')
      .addSelect('r.created_at', 'createdAt')
      .where('t.driver_id = :driverId', { driverId })
      .getRawMany<{ tripId: string | number; score: string | number; comment: string | null; createdAt: Date }>();
    const ratingByTrip = new Map(
      ratingRows.map((row) => [
        Number(row.tripId),
        {
          score: Number(row.score),
          comment: row.comment ?? null,
          createdAt: row.createdAt,
        },
      ]),
    );

    return {
      driverId: d.driverId,
      lastName: d.lastName,
      firstName: d.firstName,
      nationality: d.nationality,
      phone: d.phone,
      email: d.email,
      japaneseLevel: d.driverJapaneseLevel,
      birthDate: d.birthDate,
      gender: d.gender,
      idNumber: d.idNumber,
      avatarUrl: d.avatarUrl,
      isOnline: d.isOnline,
      lastSeenAt: d.lastSeenAt,
      vehicle: vehicle
        ? {
            brand: vehicle.brand,
            color: vehicle.color,
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
            manufactureYear: vehicle.manufactureYear,
            vehiclePhotoUrl: vehicle.vehiclePhotoUrl,
            registrationPaperUrl: vehicle.registrationPaperUrl,
          }
        : null,
      licenses: licenseRows.map((l) => ({
        licenseType: l.licenseType,
        issueDate: l.issueDate,
        expiryDate: l.expiryDate,
        issuePlace: l.issuePlace,
        frontImageUrl: l.frontImageUrl,
        backImageUrl: l.backImageUrl,
      })),
      documents: {
        portrait: d.avatarUrl,
        licenseFront: primaryLicense?.frontImageUrl ?? null,
        licenseBack: primaryLicense?.backImageUrl ?? null,
        vehiclePhoto: vehicle?.vehiclePhotoUrl ?? null,
        registrationPaper: vehicle?.registrationPaperUrl ?? null,
      },
      bankAccount: bank
        ? {
            bankName: bank.bankName,
            accountNumber: bank.accountNumber,
            accountHolder: bank.accountHolder,
          }
        : null,
      stats: {
        completedTrips,
        totalSalesJpy,
        averageRating,
        ratingCount,
      },
      trips: tripRows.map((t) => ({
        tripId: t.tripId,
        status: this.mapTripStatus(t.status),
        pickupAddress: t.rideRequest.pickupAddress,
        dropoffAddress: t.rideRequest.dropoffAddress,
        startTime: t.startTime,
        distanceKm: Number(t.actualDistanceKm),
        finalFareJpy: t.finalFareJpy,
        finalFareVnd: t.finalFareVnd,
        endTime: t.endTime,
        rating: ratingByTrip.get(t.tripId) ?? null,
      })),
    };
  }

  async getPublicProfile(driverId: number) {
    const d = await this.drivers.findOne({ where: { driverId } });
    if (!d || d.status !== DriverStatusType.approved) {
      throw new NotFoundException();
    }
    const vehicle = await this.vehicles.findOne({ where: { driverId } });
    const rating = await this.trips
      .createQueryBuilder('t')
      .innerJoin('rating', 'r', 'r.trip_id = t.trip_id')
      .select('AVG(r.score)::float', 'averageRating')
      .addSelect('COUNT(*)::int', 'ratingCount')
      .where('t.driver_id = :driverId', { driverId })
      .getRawOne<{ averageRating: string | null; ratingCount: string }>();

    return {
      driverId,
      name: `${d.lastName} ${d.firstName}`.trim(),
      avatarUrl: d.avatarUrl,
      japaneseLevel: d.driverJapaneseLevel,
      isOnline: d.isOnline,
      lastSeenAt: d.lastSeenAt,
      vehicle: vehicle
        ? {
            brand: vehicle.brand,
            color: vehicle.color,
            licensePlate: vehicle.licensePlate,
            vehicleType: vehicle.vehicleType,
          }
        : null,
      averageRating:
        rating?.averageRating == null
          ? null
          : Math.round(Number(rating.averageRating) * 100) / 100,
      ratingCount: Number(rating?.ratingCount ?? 0),
    };
  }

  async updateProfile(driverId: number, dto: UpdateDriverProfileDto) {
    const d = await this.drivers.findOne({ where: { driverId } });
    if (!d) throw new NotFoundException();
    d.lastName = dto.lastName;
    d.firstName = dto.firstName;
    d.gender = dto.gender;
    if (dto.birthDate != null && dto.birthDate !== '') {
      d.birthDate = dto.birthDate.slice(0, 10);
    }
    d.phone = dto.phone;
    d.email = dto.email;
    d.nationality = dto.nationality;
    if (dto.idNumber !== undefined) d.idNumber = dto.idNumber;
    d.driverJapaneseLevel = dto.japaneseLevel;
    if (dto.avatarUrl !== undefined) d.avatarUrl = dto.avatarUrl;
    await this.drivers.save(d);
    return this.getProfile(driverId);
  }

  async updateBankAccount(driverId: number, dto: UpdateBankAccountDto) {
    const d = await this.drivers.findOne({ where: { driverId } });
    if (!d) throw new NotFoundException();
    let row = await this.banks.findOne({ where: { driverId } });
    if (!row) {
      row = this.banks.create({
        driverId,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountHolder: dto.accountHolder,
      });
    } else {
      row.bankName = dto.bankName;
      row.accountNumber = dto.accountNumber;
      row.accountHolder = dto.accountHolder;
    }
    await this.banks.save(row);
    return this.getProfile(driverId);
  }

  async updateDocuments(driverId: number, dto: UpdateDriverDocumentsDto) {
    const driver = await this.drivers.findOne({ where: { driverId } });
    if (!driver) throw new NotFoundException();

    if (dto.portrait !== undefined) {
      driver.avatarUrl = dto.portrait;
      await this.drivers.save(driver);
    }

    if (dto.licenseFront !== undefined || dto.licenseBack !== undefined) {
      const license = await this.licenses.findOne({ where: { driverId } });
      if (!license) throw new NotFoundException('Driver license not found');
      if (dto.licenseFront !== undefined) license.frontImageUrl = dto.licenseFront;
      if (dto.licenseBack !== undefined) license.backImageUrl = dto.licenseBack;
      await this.licenses.save(license);
    }

    if (dto.vehiclePhoto !== undefined || dto.registrationPaper !== undefined) {
      const vehicle = await this.vehicles.findOne({ where: { driverId } });
      if (!vehicle) throw new NotFoundException('Vehicle not found');
      if (dto.vehiclePhoto !== undefined) vehicle.vehiclePhotoUrl = dto.vehiclePhoto;
      if (dto.registrationPaper !== undefined) vehicle.registrationPaperUrl = dto.registrationPaper;
      await this.vehicles.save(vehicle);
    }

    return this.getProfile(driverId);
  }

  async setAvailability(driverId: number, isOnline: boolean) {
    const driver = await this.drivers.findOne({ where: { driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    driver.isOnline = isOnline;
    driver.lastSeenAt = new Date();
    await this.drivers.save(driver);
    return { driverId, isOnline, lastSeenAt: driver.lastSeenAt };
  }

  async getPayouts(driverId: number) {
    const items = await this.payouts.find({
      where: { driverId },
      order: { payoutId: 'DESC' },
    });
    const totals = items.reduce(
      (sum, item) => ({
        grossFareVnd: sum.grossFareVnd + item.grossFareVnd,
        commissionVnd: sum.commissionVnd + item.commissionVnd,
        netAmountVnd: sum.netAmountVnd + item.amountVnd,
      }),
      { grossFareVnd: 0, commissionVnd: 0, netAmountVnd: 0 },
    );
    return { items, totals };
  }

  private createDriverSearchQuery(
    q: SearchDriversQueryDto,
    radiusKm: number,
    maxAgeMin: number,
    applyOptionalFilters: boolean,
  ) {
    const qb = this.drivers
      .createQueryBuilder('d')
      .innerJoin(
        `(SELECT DISTINCT ON (driver_id) driver_id,
            latitude::double precision AS lat,
            longitude::double precision AS lng,
            recorded_at
          FROM driver_location_history
          ORDER BY driver_id, recorded_at DESC)`,
        'latest',
        'latest.driver_id = d.driver_id',
      )
      .innerJoin('vehicle', 'v', 'v.driver_id = d.driver_id')
      .leftJoin(
        `(SELECT t.driver_id, AVG(r.score)::float AS avg_score, COUNT(*)::int AS rating_cnt
          FROM trip t
          INNER JOIN rating r ON r.trip_id = t.trip_id
          WHERE t.status = 'completed'
          GROUP BY t.driver_id)`,
        'rt',
        'rt.driver_id = d.driver_id',
      )
      .where('d.status = :approved', { approved: DriverStatusType.approved })
      .andWhere('d.is_online = true')
      .andWhere(
        `latest.recorded_at >= NOW() - (INTERVAL '1 minute' * CAST(:maxAgeMin AS integer))`,
        { maxAgeMin },
      )
      .andWhere(`${HAVERSINE_KM_SQL} <= :radiusKm`, { radiusKm })
      .setParameters({ searchLat: q.lat, searchLng: q.lng });

    if (applyOptionalFilters) {
      if (q.vehicleType != null) {
        qb.andWhere('v.vehicle_type = :vehicleType', { vehicleType: q.vehicleType });
      }

      if (q.minJapaneseLevel != null) {
        qb.andWhere(
          `(CASE d.driver_japanese_level
            WHEN 'N5' THEN 1 WHEN 'N4' THEN 2 WHEN 'N3' THEN 3
            WHEN 'N2' THEN 4 WHEN 'N1' THEN 5 WHEN 'Native' THEN 6
          END) >= :minJapaneseRank`,
          { minJapaneseRank: JAPANESE_LEVEL_RANK[q.minJapaneseLevel] },
        );
      }

      if (q.minRating != null) {
        qb.andWhere('rt.avg_score IS NOT NULL AND rt.avg_score >= :minRating', {
          minRating: q.minRating,
        });
      }
    }

    return qb;
  }

  /**
   * Tìm tài xế đã duyệt, có phương tiện và có ít nhất một bản ghi vị trí gần đây,
   * trong bán kính km quanh (lat, lng), kèm lọc tùy chọn.
   */
  async searchDrivers(q: SearchDriversQueryDto) {
    const radiusKm = q.radiusKm ?? 10;
    const maxAgeMin = q.maxLocationAgeMinutes ?? 30;
    const limit = Math.min(q.limit ?? 20, 50);
    const sort = q.sort ?? DriverSearchSort.distance;

    const qb = this.createDriverSearchQuery(q, radiusKm, maxAgeMin, true);

    qb.select([
      'd.driver_id AS "driverId"',
      'd.last_name AS "lastName"',
      'd.first_name AS "firstName"',
      'd.avatar_url AS "avatarUrl"',
      'd.driver_japanese_level AS "japaneseLevel"',
      'v.vehicle_type AS "vehicleType"',
      'v.brand AS "vehicleBrand"',
      'v.color AS "vehicleColor"',
      'v.license_plate AS "licensePlate"',
      'latest.lat AS "latitude"',
      'latest.lng AS "longitude"',
      'latest.recorded_at AS "locationRecordedAt"',
      `${HAVERSINE_KM_SQL} AS "distanceKm"`,
      'rt.avg_score AS "averageRating"',
      'rt.rating_cnt AS "ratingCount"',
    ]);

    if (sort === DriverSearchSort.rating) {
      qb.orderBy('rt.avg_score', 'DESC', 'NULLS LAST').addOrderBy(HAVERSINE_KM_SQL, 'ASC');
    } else {
      qb.orderBy(HAVERSINE_KM_SQL, 'ASC');
    }

    qb.limit(limit);

    const rows = await qb.getRawMany<
      Record<string, string | number | Date | null>
    >();

    const drivers = rows.map((row) => ({
      driverId: Number(row.driverId),
      lastName: String(row.lastName ?? ''),
      firstName: String(row.firstName ?? ''),
      avatarUrl: row.avatarUrl != null ? String(row.avatarUrl) : null,
      japaneseLevel: String(row.japaneseLevel ?? ''),
      vehicle: {
        vehicleType: String(row.vehicleType ?? ''),
        brand: String(row.vehicleBrand ?? ''),
        color: String(row.vehicleColor ?? ''),
        licensePlate: String(row.licensePlate ?? ''),
      },
      location: {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        recordedAt: row.locationRecordedAt,
      },
      distanceKm: row.distanceKm != null ? Math.round(Number(row.distanceKm) * 1000) / 1000 : null,
      averageRating:
        row.averageRating != null ? Math.round(Number(row.averageRating) * 100) / 100 : null,
      ratingCount: row.ratingCount != null ? Number(row.ratingCount) : 0,
    }));

    const count = drivers.length;
    const hasResults = count > 0;

    let notification: DriverSearchNotification | null = null;
    if (!hasResults) {
      const driversInArea = await this.createDriverSearchQuery(
        q,
        radiusKm,
        maxAgeMin,
        false,
      ).getCount();
      notification = buildNoDriversNotification(q, driversInArea);
    }

    return {
      drivers,
      count,
      hasResults,
      notification,
    };
  }

  // ==================== LOGIC XÉT DUYỆT TÀI XẾ ====================
  async applyToBeDriver(driverId: number, dto: ApplyDriverDto) {
    const driver = await this.drivers.findOne({ where: { driverId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    if (!dto.licenseNumber || !dto.vehiclePlate || !dto.vehicleType) {
      throw new BadRequestException(
        'Missing required fields: licenseNumber, vehiclePlate, vehicleType',
      );
    }

    const vehicleType = dto.vehicleType as VehicleTypeEnum;
    if (!Object.values(VehicleTypeEnum).includes(vehicleType)) {
      throw new BadRequestException('Invalid vehicleType');
    }

    const licenseType = dto.licenseType as LicenseTypeEnum;
    if (!Object.values(LicenseTypeEnum).includes(licenseType)) {
      throw new BadRequestException('Invalid licenseType');
    }

    let vehicle = await this.vehicles.findOne({ where: { driverId } });
    if (!vehicle) {
      vehicle = this.vehicles.create({
        driverId,
        vehicleType,
        licensePlate: dto.vehiclePlate,
        brand: dto.vehicleBrand ?? '',
        color: '',
        manufactureYear: new Date().getFullYear(),
      });
    } else {
      vehicle.vehicleType = vehicleType;
      vehicle.licensePlate = dto.vehiclePlate;
      if (dto.vehicleBrand) vehicle.brand = dto.vehicleBrand;
    }
    await this.vehicles.save(vehicle);

    const today = new Date().toISOString().slice(0, 10);
    let license = await this.licenses.findOne({ where: { driverId } });
    if (!license) {
      license = this.licenses.create({
        driverId,
        licenseType,
        issueDate: today,
        expiryDate: today,
        issuePlace: dto.licenseNumber,
      });
    } else {
      license.licenseType = licenseType;
      license.issuePlace = dto.licenseNumber;
    }
    await this.licenses.save(license);

    driver.status = DriverStatusType.pending;
    return this.drivers.save(driver);
  }

  async approveDriver(
    driverId: number,
    status: 'approved' | 'rejected',
    _reason?: string,
  ) {
    const driver = await this.drivers.findOne({ where: { driverId } });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    driver.status =
      status === 'approved' ? DriverStatusType.approved : DriverStatusType.rejected;
    if (status === 'approved') {
      driver.approvedAt = new Date();
    }

    return this.drivers.save(driver);
  }
}
