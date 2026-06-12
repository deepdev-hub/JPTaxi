import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverLicense } from '../../entities/driver-license.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { Trip } from '../../entities/trip.entity';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverPayout } from '../../entities/driver-payout.entity';
import { DriverLocationHistory } from '../../entities/driver-location-history.entity';
import { DriverInsurance } from '../../entities/driver-insurance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      Vehicle,
      DriverLicense,
      DriverBankAccount,
      Trip,
      DriverPayout,
      DriverLocationHistory,
      DriverInsurance,
    ]),
  ],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
