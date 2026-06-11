import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { LoginHistory } from '../../entities/login-history.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerSavedPlace } from '../../entities/customer-saved-place.entity';
import { CustomerNotificationPreference } from '../../entities/customer-notification-preference.entity';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { SearchHistory } from '../../entities/search-history.entity';
import { RolesGuard } from '../../common/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      LoginHistory,
      CustomerSavedPlace,
      CustomerNotificationPreference,
      CustomerPaymentMethod,
      SearchHistory,
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService, RolesGuard],
})
export class CustomersModule {}
