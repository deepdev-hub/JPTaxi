import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, DriverStatusType } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverLicense } from '../../entities/driver-license.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { ApplyDriverDto } from './dto/apply-driver.dto';
import { LicenseTypeEnum } from '../../entities/driver-license.entity';
import { VehicleTypeEnum } from '../../entities/vehicle.entity';
import { DriverPayout } from '../../entities/driver-payout.entity';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { resolveAvailabilityStatus } from './driver-approval.policy';
import { DriverInsurance } from '../../entities/driver-insurance.entity';
import { UpdateDriverInsuranceDto } from './dto/update-driver-insurance.dto';
import { getDriverInsuranceStatus } from './driver-insurance-status';

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
    @InjectRepository(DriverLocationHistory)
    private readonly locations: Repository<DriverLocationHistory>,
    @InjectRepository(DriverInsurance)
    private readonly insurance: Repository<DriverInsurance>,
    private readonly config: ConfigService,
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
    const latestLocation = await this.locations.findOne({
      where: { driverId },
      order: { recordedAt: 'DESC' },
    });
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
      status: d.status,
      isOnline: d.isOnline,
      lastSeenAt: d.lastSeenAt,
      latestLocation: latestLocation
        ? {
            latitude: Number(latestLocation.latitude),
            longitude: Number(latestLocation.longitude),
            recordedAt: latestLocation.recordedAt,
          }
        : null,
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
    driver.status = resolveAvailabilityStatus(
      driver.status,
      isOnline,
      this.config.get<boolean>('AUTO_APPROVE_DRIVERS', false),
    );
    if (isOnline && driver.status !== DriverStatusType.approved) {
      throw new BadRequestException({
        code: 'DRIVER_APPROVAL_PENDING',
        message: 'Driver approval is pending.',
      });
    }
    if (isOnline) {
      const latestLocation = await this.locations.findOne({
        where: { driverId },
        order: { recordedAt: 'DESC' },
      });
      if (!latestLocation) {
        throw new BadRequestException({
          code: 'DRIVER_LOCATION_REQUIRED',
          message: 'A current driver location is required.',
        });
      }
    }
    if (driver.status === DriverStatusType.approved && !driver.approvedAt) {
      driver.approvedAt = new Date();
    }
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

  async getInsurance(driverId: number) {
    const row = await this.insurance.findOne({ where: { driverId } });
    if (!row) return { insurance: null, status: 'missing' };
    return {
      insurance: row,
      status: getDriverInsuranceStatus(row.expiryDate),
    };
  }

  async updateInsurance(driverId: number, dto: UpdateDriverInsuranceDto) {
    if (dto.expiryDate < dto.effectiveDate) {
      throw new BadRequestException({
        code: 'INVALID_INSURANCE_DATES',
        message: 'Insurance expiry date must not precede its effective date.',
      });
    }
    const driver = await this.drivers.findOne({ where: { driverId } });
    if (!driver) throw new NotFoundException('Driver not found');
    let row = await this.insurance.findOne({ where: { driverId } });
    row = row
      ? Object.assign(row, dto)
      : this.insurance.create({ driverId, ...dto });
    await this.insurance.save(row);
    return this.getInsurance(driverId);
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
