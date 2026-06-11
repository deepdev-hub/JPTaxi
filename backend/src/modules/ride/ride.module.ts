import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { RideGateway } from './ride.gateway';
import { RideRequest } from '../../entities/ride-request.entity';
import { Trip } from '../../entities/trip.entity';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { Customer } from '../../entities/customer.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { DriverPayout } from '../../entities/driver-payout.entity';
import { Driver } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { RideRequestDispatch } from '../../entities/ride-request-dispatch.entity';
import { Conversation } from '../../entities/conversation.entity';
import { AuthModule } from '../auth/auth.module';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { PricingRule } from '../../entities/pricing-rule.entity';
import { MapModule } from '../map/map.module';

@Module({
  imports: [
    MapModule,
    TypeOrmModule.forFeature([
      RideRequest,
      Trip,
      DriverLocationHistory,
      Customer,
      PaymentTransaction,
      DriverPayout,
      Driver,
      Vehicle,
      RideRequestDispatch,
      Conversation,
      CustomerPaymentMethod,
      DriverBankAccount,
      PricingRule,
    ]),
    AuthModule,
  ],
  controllers: [RideController],
  providers: [RideService, RideGateway],
  exports: [RideService, RideGateway],
})
export class RideModule {}
