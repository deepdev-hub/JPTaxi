import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  decodeRatingComment,
  encodeRatingComment,
  scoreLabelJa,
} from '../../common/rating-comment.util';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Rating } from '../../entities/rating.entity';
import { Trip, TripStatusType } from '../../entities/trip.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { SubmitRatingDto } from './dto/submit-rating.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratings: Repository<Rating>,
    @InjectRepository(Trip)
    private readonly trips: Repository<Trip>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
  ) {}

  async getReviewContext(tripId: number, user: { id: number; role: string }) {
    const trip = await this.loadTripWithRequest(tripId);
    this.assertCustomerOnTrip(trip, user);

    const driver = await this.drivers.findOne({ where: { driverId: trip.driverId } });
    const vehicle = await this.vehicles.findOne({ where: { driverId: trip.driverId } });
    const existing = await this.ratings.findOne({ where: { tripId } });

    return {
      tripId,
      tripStatus: trip.status,
      canRate: trip.status === TripStatusType.completed,
      driver: driver
        ? {
            driverId: driver.driverId,
            name: `${driver.lastName} ${driver.firstName}`.trim(),
            avatarUrl: driver.avatarUrl,
            vehicle: vehicle
              ? {
                  brand: vehicle.brand,
                  color: vehicle.color,
                  licensePlate: vehicle.licensePlate,
                  vehicleType: vehicle.vehicleType,
                }
              : null,
          }
        : null,
      existingRating: existing ? this.toRatingResponse(existing) : null,
    };
  }

  async createRating(
    tripId: number,
    user: { id: number; role: string },
    dto: SubmitRatingDto,
  ) {
    const trip = await this.loadTripWithRequest(tripId);
    this.assertCustomerOnTrip(trip, user);
    this.assertTripCompleted(trip);

    const exists = await this.ratings.findOne({ where: { tripId } });
    if (exists) {
      throw new ConflictException(
        'Chuyến đi này đã được đánh giá. Dùng PUT để cập nhật.',
      );
    }

    const row = this.ratings.create({
      tripId,
      customerId: user.id,
      score: dto.score,
      comment: encodeRatingComment(dto.tags ?? [], dto.comment ?? ''),
    });
    const saved = await this.ratings.save(row);
    return {
      message: 'Đánh giá đã được gửi.',
      rating: this.toRatingResponse(saved),
    };
  }

  async updateRating(
    tripId: number,
    user: { id: number; role: string },
    dto: SubmitRatingDto,
  ) {
    const trip = await this.loadTripWithRequest(tripId);
    this.assertCustomerOnTrip(trip, user);
    this.assertTripCompleted(trip);

    const row = await this.ratings.findOne({ where: { tripId } });
    if (!row) {
      throw new NotFoundException('Chưa có đánh giá cho chuyến đi này.');
    }
    if (row.customerId !== user.id) {
      throw new ForbiddenException('Bạn không thể sửa đánh giá này.');
    }

    row.score = dto.score;
    row.comment = encodeRatingComment(dto.tags ?? [], dto.comment ?? '');
    const saved = await this.ratings.save(row);
    return {
      message: 'Đánh giá đã được cập nhật.',
      rating: this.toRatingResponse(saved),
    };
  }

  async getTripRating(tripId: number, user: { id: number; role: string }) {
    const trip = await this.loadTripWithRequest(tripId);
    this.assertTripParticipant(trip, user);

    const row = await this.ratings.findOne({ where: { tripId } });
    if (!row) {
      return { tripId, rating: null };
    }
    return { tripId, rating: this.toRatingResponse(row) };
  }

  async getDriverRatingsSummary(driverId: number) {
    const row = await this.ratings
      .createQueryBuilder('r')
      .innerJoin('trip', 't', 't.trip_id = r.trip_id')
      .select('AVG(r.score)::float', 'averageScore')
      .addSelect('COUNT(*)::int', 'ratingCount')
      .where('t.driver_id = :driverId', { driverId })
      .getRawOne<{ averageScore: string | null; ratingCount: string }>();

    const count = Number(row?.ratingCount ?? 0);
    const avg =
      row?.averageScore != null
        ? Math.round(Number(row.averageScore) * 100) / 100
        : null;

    return { driverId, averageScore: avg, ratingCount: count };
  }

  async listDriverRatings(
    driverId: number,
    user: { id: number; role: string },
    limit = 20,
    offset = 0,
  ) {
    if (user.role === 'driver' && user.id !== driverId) {
      throw new ForbiddenException('Chỉ xem được đánh giá của chính mình.');
    }

    const take = Math.min(Math.max(limit, 1), 50);
    const skip = Math.max(offset, 0);

    const qb = this.ratings
      .createQueryBuilder('r')
      .innerJoin('trip', 't', 't.trip_id = r.trip_id')
      .innerJoin('customer', 'c', 'c.customer_id = r.customer_id')
      .select([
        'r.rating_id AS "ratingId"',
        'r.trip_id AS "tripId"',
        'r.score AS "score"',
        'r.comment AS "comment"',
        'r.created_at AS "createdAt"',
        'c.first_name AS "customerFirstName"',
        'c.last_name AS "customerLastName"',
      ])
      .where('t.driver_id = :driverId', { driverId })
      .orderBy('r.created_at', 'DESC')
      .offset(skip)
      .limit(take);

    const rows = await qb.getRawMany<Record<string, string | number | Date>>();
    const summary = await this.getDriverRatingsSummary(driverId);

    return {
      ...summary,
      items: rows.map((row) => {
        const decoded = decodeRatingComment(
          row.comment != null ? String(row.comment) : null,
        );
        return {
          ratingId: Number(row.ratingId),
          tripId: Number(row.tripId),
          score: Number(row.score),
          scoreLabelJa: scoreLabelJa(Number(row.score)),
          tags: decoded.tags,
          comment: decoded.text || null,
          createdAt: row.createdAt,
          customerName: `${row.customerLastName ?? ''} ${row.customerFirstName ?? ''}`.trim(),
        };
      }),
      limit: take,
      offset: skip,
    };
  }

  private toRatingResponse(row: Rating) {
    const decoded = decodeRatingComment(row.comment);
    return {
      ratingId: row.ratingId,
      tripId: row.tripId,
      score: row.score,
      scoreLabelJa: scoreLabelJa(row.score),
      tags: decoded.tags,
      comment: decoded.text || null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async loadTripWithRequest(tripId: number): Promise<Trip> {
    const trip = await this.trips.findOne({
      where: { tripId },
      relations: ['rideRequest'],
    });
    if (!trip) {
      throw new NotFoundException('Không tìm thấy chuyến đi.');
    }
    return trip;
  }

  private assertCustomerOnTrip(
    trip: Trip,
    user: { id: number; role: string },
  ): void {
    if (user.role !== 'customer') {
      throw new ForbiddenException('Chỉ khách hàng mới có thể đánh giá tài xế.');
    }
    if (trip.rideRequest.customerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền đánh giá chuyến này.');
    }
  }

  private assertTripParticipant(
    trip: Trip,
    user: { id: number; role: string },
  ): void {
    if (user.role === 'driver') {
      if (trip.driverId !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem đánh giá chuyến này.');
      }
      return;
    }
    if (trip.rideRequest.customerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền xem đánh giá chuyến này.');
    }
  }

  private assertTripCompleted(trip: Trip): void {
    if (trip.status !== TripStatusType.completed) {
      throw new BadRequestException(
        'Chỉ có thể đánh giá sau khi chuyến đi hoàn thành.',
      );
    }
  }
}
