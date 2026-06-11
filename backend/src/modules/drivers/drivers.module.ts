import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from '../../entities/driver.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverLicense } from '../../entities/driver-license.entity';
import { DriverBankAccount } from '../../entities/driver-bank-account.entity';
import { Trip } from '../../entities/trip.entity';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Driver,
      Vehicle,
      DriverLicense,
      DriverBankAccount,
      Trip,
    ]),
  ],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
