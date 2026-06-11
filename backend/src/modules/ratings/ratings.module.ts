import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Rating } from '../../entities/rating.entity';
import { Trip } from '../../entities/trip.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { AuthModule } from '../auth/auth.module';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rating, Trip, Driver, Customer, Vehicle]),
    AuthModule,
  ],
  controllers: [RatingsController],
  providers: [RatingsService],
  exports: [RatingsService],
})
export class RatingsModule {}
