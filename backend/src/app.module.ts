import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { Customer } from './entities/customer.entity';
import { Driver } from './entities/driver.entity';
import { Admin } from './entities/admin.entity';
import { Vehicle } from './entities/vehicle.entity';
import { DriverBankAccount } from './entities/driver-bank-account.entity';
import { DriverLicense } from './entities/driver-license.entity';
import { Trip } from './entities/trip.entity';
import { RideRequest } from './entities/ride-request.entity';
import { LoginHistory } from './entities/login-history.entity';
import { DriverLocationHistory } from './entities/driver-location-history.entity';
import { Rating } from './entities/rating.entity';
import { PricingRule } from './entities/pricing-rule.entity';
import { RideRequestDispatch } from './entities/ride-request-dispatch.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { DriverPayout } from './entities/driver-payout.entity';
import { SearchHistory } from './entities/search-history.entity';
import { UserLink } from './entities/user-link.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { AuthModule } from './modules/auth/auth.module';
import { RideModule } from './modules/ride/ride.module';
import { AdminModule } from './modules/admin/admin.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { MessagesModule } from './modules/messages/messages.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '.env'),
        join(__dirname, '..', '.env.local'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const entities = [
          Customer,
          Driver,
          Admin,
          Vehicle,
          DriverBankAccount,
          DriverLicense,
          Trip,
          RideRequest,
          LoginHistory,
          DriverLocationHistory,
          Rating,
          PricingRule,
          RideRequestDispatch,
          PaymentTransaction,
          DriverPayout,
          SearchHistory,
          UserLink,
          AuditLog,
          Conversation,
          Message,
        ];
        const databaseUrl = config.get<string>('DATABASE_URL');
        const sslEnabled =
          config.get<string>('DB_SSL') === 'true' || Boolean(databaseUrl);
        const ssl = sslEnabled ? { rejectUnauthorized: false } : undefined;

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities,
            synchronize: false,
            logging: false,
            ssl,
          };
        }

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST', 'localhost'),
          port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
          username: config.get<string>('DB_USER', 'postgres'),
          password: config.get<string>('DB_PASS') ?? '123456',
          database: config.get<string>('DB_NAME', 'JPTaxi'),
          entities,
          synchronize: false,
          logging: false,
          ssl,
        };
      },
    }),
    AuthModule,
    RideModule,
    AdminModule,
    CustomersModule,
    DriversModule,
    UploadsModule,
    RatingsModule,
    InvoicesModule,
    MessagesModule,
  ],
})
export class AppModule {}
