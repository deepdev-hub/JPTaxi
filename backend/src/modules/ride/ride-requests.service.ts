import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  RideRequest,
  RideRequestStatusType,
} from '../../entities/ride-request.entity';
import {
  DispatchStatusType,
  RideRequestDispatch,
} from '../../entities/ride-request-dispatch.entity';
import { Driver, DriverStatusType } from '../../entities/driver.entity';
import { Customer } from '../../entities/customer.entity';
import { Vehicle, VehicleTypeEnum } from '../../entities/vehicle.entity';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestStatusDto } from './dto/update-ride-request-status.dto';

const MAX_DISPATCH_PER_REQUEST = 3;

@Injectable()
export class RideRequestsService {
  constructor(
    @InjectRepository(RideRequest)
    private readonly rideRequests: Repository<RideRequest>,
    @InjectRepository(RideRequestDispatch)
    private readonly dispatches: Repository<RideRequestDispatch>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    private readonly dataSource: DataSource,
  ) {}

  calculateEstimate(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
    vehicleType?: string,
  ) {
    const distance =
      Math.sqrt(
        Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2),
      ) * 111;
    const time = Math.round((distance / 30) * 60);
    const rates: Record<string, number> = {
      '4': 12000,
      '7': 15000,
      '9': 20000,
    };
    const pricePerKm = rates[vehicleType ?? '4'] ?? 12000;
    const totalPrice = Math.round(distance * pricePerKm);

    return {
      distance_km: distance.toFixed(2),
      estimated_time_minutes: time,
      total_price: totalPrice,
      currency: 'VND',
    };
  }

  async createForCustomer(customerId: number, dto: CreateRideRequestDto) {
    const estimate = this.calculateEstimate(
      dto.pickupLat,
      dto.pickupLng,
      dto.dropoffLat,
      dto.dropoffLng,
      dto.vehicleType,
    );

    const driverIds = await this.findDispatchDriverIds(dto.vehicleType);
    if (!driverIds.length) {
      throw new BadRequestException(
        '対応可能なドライバーが見つかりません。しばらくしてから再度お試しください。',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const rideRepo = manager.getRepository(RideRequest);
      const dispatchRepo = manager.getRepository(RideRequestDispatch);

      const request = rideRepo.create({
        customerId,
        pickupAddress: dto.pickupAddress,
        pickupLat: String(dto.pickupLat),
        pickupLng: String(dto.pickupLng),
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: String(dto.dropoffLat),
        dropoffLng: String(dto.dropoffLng),
        vehicleType: dto.vehicleType,
        actualPassengerName: dto.actualPassengerName ?? null,
        actualPassengerPhone: dto.actualPassengerPhone ?? null,
        requestTime: new Date(),
        status: RideRequestStatusType.searching,
        noteToDriver: dto.noteToDriver ?? null,
        estimatedFareVnd: dto.estimatedFareVnd ?? null,
        estimatedFareJpy: dto.estimatedFareJpy ?? null,
        rawFareVnd: dto.rawFareVnd ?? null,
      });
      const saved = await rideRepo.save(request);

      const now = new Date();
      const dispatchRows = driverIds.map((driverId, index) =>
        dispatchRepo.create({
          requestId: saved.requestId,
          driverId,
          attemptNumber: index + 1,
          status: DispatchStatusType.pending,
          sentAt: now,
          respondedAt: null,
        }),
      );
      await dispatchRepo.save(dispatchRows);

      return {
        ...this.toRideResponse(saved, estimate),
        dispatch_count: dispatchRows.length,
      };
    });
  }

  async getById(requestId: number, userId: number, role: string) {
    const request = await this.rideRequests.findOne({
      where: { requestId },
    });
    if (!request) {
      throw new NotFoundException('予約が見つかりません');
    }
    await this.assertCanAccess(request, userId, role);

    const estimate = this.calculateEstimate(
      Number(request.pickupLat),
      Number(request.pickupLng),
      Number(request.dropoffLat),
      Number(request.dropoffLng),
      request.vehicleType,
    );

    const assignedDriver = await this.getAssignedDriverInfo(request);
    const pendingDispatchCount = await this.dispatches.count({
      where: {
        requestId,
        status: DispatchStatusType.pending,
      },
    });

    return {
      ...this.toRideResponse(request, estimate),
      pending_dispatch_count: pendingDispatchCount,
      assigned_driver: assignedDriver,
    };
  }

  async updateStatus(
    requestId: number,
    userId: number,
    role: string,
    dto: UpdateRideRequestStatusDto,
  ) {
    const request = await this.rideRequests.findOne({
      where: { requestId },
    });
    if (!request) {
      throw new NotFoundException('予約が見つかりません');
    }
    await this.assertCanAccess(request, userId, role);

    const next = dto.status;
    if (role === 'customer') {
      if (
        next === RideRequestStatusType.failed &&
        (request.status === RideRequestStatusType.searching ||
          request.status === RideRequestStatusType.pending)
      ) {
        request.status = next;
        await this.rideRequests.save(request);
        await this.dispatches.update(
          { requestId, status: DispatchStatusType.pending },
          { status: DispatchStatusType.timeout, respondedAt: new Date() },
        );
        return this.getById(requestId, userId, role);
      }
      if (
        next === RideRequestStatusType.completed &&
        request.status === RideRequestStatusType.assigned
      ) {
        request.status = next;
        await this.rideRequests.save(request);
        return this.getById(requestId, userId, role);
      }
      throw new BadRequestException('このステータス変更は許可されていません');
    }

    if (role === 'driver') {
      if (
        next === RideRequestStatusType.completed &&
        request.status === RideRequestStatusType.assigned
      ) {
        const accepted = await this.dispatches.findOne({
          where: {
            requestId,
            driverId: userId,
            status: DispatchStatusType.accepted,
          },
        });
        if (!accepted) {
          throw new ForbiddenException('この予約を完了できる権限がありません');
        }
        request.status = next;
        await this.rideRequests.save(request);
        return this.getById(requestId, userId, role);
      }
      throw new BadRequestException('このステータス変更は許可されていません');
    }

    throw new ForbiddenException();
  }

  async getPendingDispatchForDriver(driverId: number) {
    const dispatch = await this.dispatches.findOne({
      where: {
        driverId,
        status: DispatchStatusType.pending,
      },
      order: { sentAt: 'DESC' },
    });
    if (!dispatch) {
      return null;
    }

    const request = await this.rideRequests.findOne({
      where: {
        requestId: dispatch.requestId,
        status: RideRequestStatusType.searching,
      },
    });
    if (!request) {
      return null;
    }

    const customer = await this.customers.findOne({
      where: { customerId: request.customerId },
    });
    const estimate = this.calculateEstimate(
      Number(request.pickupLat),
      Number(request.pickupLng),
      Number(request.dropoffLat),
      Number(request.dropoffLng),
      request.vehicleType,
    );

    return {
      dispatch_id: dispatch.dispatchId,
      attempt_number: dispatch.attemptNumber,
      sent_at: dispatch.sentAt,
      ...this.toRideResponse(request, estimate),
      customer: customer
        ? {
            customer_id: customer.customerId,
            last_name: customer.lastName,
            first_name: customer.firstName,
            phone: customer.phone,
          }
        : null,
    };
  }

  async acceptDispatch(dispatchId: number, driverId: number) {
    return this.respondDispatch(dispatchId, driverId, 'accept');
  }

  async rejectDispatch(dispatchId: number, driverId: number) {
    return this.respondDispatch(dispatchId, driverId, 'reject');
  }

  private async respondDispatch(
    dispatchId: number,
    driverId: number,
    action: 'accept' | 'reject',
  ) {
    const dispatch = await this.dispatches.findOne({
      where: { dispatchId },
    });
    if (!dispatch || dispatch.driverId !== driverId) {
      throw new NotFoundException('配車リクエストが見つかりません');
    }
    if (dispatch.status !== DispatchStatusType.pending) {
      throw new BadRequestException('この配車リクエストは既に処理済みです');
    }

    const request = await this.rideRequests.findOne({
      where: { requestId: dispatch.requestId },
    });
    if (!request || request.status !== RideRequestStatusType.searching) {
      throw new BadRequestException('予約は受付できない状態です');
    }

    const now = new Date();

    if (action === 'reject') {
      dispatch.status = DispatchStatusType.rejected;
      dispatch.respondedAt = now;
      await this.dispatches.save(dispatch);
      return {
        dispatch_id: dispatchId,
        status: 'rejected',
        request_id: request.requestId,
        ride_status: request.status,
      };
    }

    await this.dataSource.transaction(async (manager) => {
      const rideRepo = manager.getRepository(RideRequest);
      const dispatchRepo = manager.getRepository(RideRequestDispatch);

      const claimResult = await rideRepo.update(
        { requestId: request.requestId, status: RideRequestStatusType.searching },
        { status: RideRequestStatusType.assigned },
      );
      if (!claimResult.affected) {
        throw new BadRequestException('この配車リクエストは他のドライバーが承認しました。');
      }

      const acceptResult = await dispatchRepo.update(
        { dispatchId, driverId, status: DispatchStatusType.pending },
        { status: DispatchStatusType.accepted, respondedAt: now },
      );
      if (!acceptResult.affected) {
        throw new BadRequestException('この配車リクエストは既に処理済みです');
      }

      await dispatchRepo.update(
        {
          requestId: request.requestId,
          status: DispatchStatusType.pending,
        },
        { status: DispatchStatusType.rejected, respondedAt: now },
      );
    });

    return this.getById(request.requestId, driverId, 'driver');
  }

  private async findDispatchDriverIds(
    vehicleType: VehicleTypeEnum,
  ): Promise<number[]> {
    const matchingVehicles = await this.vehicles.find({
      where: { vehicleType },
      order: { driverId: 'ASC' },
      take: MAX_DISPATCH_PER_REQUEST * 3,
    });
    const ids: number[] = [];
    for (const vehicle of matchingVehicles) {
      if (ids.length >= MAX_DISPATCH_PER_REQUEST) {
        break;
      }
      const driver = await this.drivers.findOne({
        where: {
          driverId: vehicle.driverId,
          status: DriverStatusType.approved,
        },
      });
      if (driver) {
        ids.push(driver.driverId);
      }
    }
    return ids;
  }

  private async getAssignedDriverInfo(request: RideRequest) {
    if (request.status !== RideRequestStatusType.assigned) {
      return null;
    }
    const dispatch = await this.dispatches.findOne({
      where: {
        requestId: request.requestId,
        status: DispatchStatusType.accepted,
      },
    });
    if (!dispatch) {
      return null;
    }
    const driver = await this.drivers.findOne({
      where: { driverId: dispatch.driverId },
    });
    const vehicle = await this.vehicles.findOne({
      where: { driverId: dispatch.driverId },
    });
    if (!driver) {
      return null;
    }
    return {
      driver_id: driver.driverId,
      last_name: driver.lastName,
      first_name: driver.firstName,
      phone: driver.phone,
      vehicle: vehicle
        ? {
            brand: vehicle.brand,
            color: vehicle.color,
            license_plate: vehicle.licensePlate,
            vehicle_type: vehicle.vehicleType,
          }
        : null,
    };
  }

  private async assertCanAccess(
    request: RideRequest,
    userId: number,
    role: string,
  ) {
    if (role === 'customer' && request.customerId === userId) {
      return;
    }
    if (role === 'driver') {
      const linked = await this.dispatches.findOne({
        where: { requestId: request.requestId, driverId: userId },
      });
      if (linked) {
        return;
      }
    }
    throw new ForbiddenException('この予約にアクセスする権限がありません');
  }

  private toRideResponse(
    request: RideRequest,
    estimate: ReturnType<RideRequestsService['calculateEstimate']>,
  ) {
    return {
      request_id: request.requestId,
      customer_id: request.customerId,
      pickup_address: request.pickupAddress,
      pickup_lat: Number(request.pickupLat),
      pickup_lng: Number(request.pickupLng),
      dropoff_address: request.dropoffAddress,
      dropoff_lat: Number(request.dropoffLat),
      dropoff_lng: Number(request.dropoffLng),
      vehicle_type: request.vehicleType,
      actual_passenger_name: request.actualPassengerName,
      actual_passenger_phone: request.actualPassengerPhone,
      request_time: request.requestTime,
      status: request.status,
      note_to_driver: request.noteToDriver,
      estimate,
    };
  }
}
