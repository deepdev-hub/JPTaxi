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
import { CustomerSavedPlace } from './entities/customer-saved-place.entity';
import { CustomerNotificationPreference } from './entities/customer-notification-preference.entity';
import { CustomerPaymentMethod } from './entities/customer-payment-method.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { Invoice } from './entities/invoice.entity';
import { RideSearchDriverExclusion } from './entities/ride-search-driver-exclusion.entity';
import { DriverInsurance } from './entities/driver-insurance.entity';
import { AuthModule } from './modules/auth/auth.module';
import { RideModule } from './modules/ride/ride.module';
import { AdminModule } from './modules/admin/admin.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { MessagesModule } from './modules/messages/messages.module';
import { MailModule } from './modules/mail/mail.module';
import { MapModule } from './modules/map/map.module';
import { validateEnvironment } from './config/environment';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
      envFilePath: [
        join(__dirname, '..', '.env'),
        join(__dirname, '..', '.env.local'),
      ],
    }),
    ScheduleModule.forRoot(),
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
          CustomerSavedPlace,
          CustomerNotificationPreference,
          CustomerPaymentMethod,
          PasswordResetToken,
          Invoice,
          RideSearchDriverExclusion,
          DriverInsurance,
        ];
        const databaseUrl = config.getOrThrow<string>('DATABASE_URL');
        const sslEnabled = config.get<boolean>('DB_SSL') === true;
        const ssl = sslEnabled ? { rejectUnauthorized: false } : undefined;

        return {
          type: 'postgres' as const,
          url: databaseUrl,
          entities,
          synchronize: false,
          logging: false,
          ssl,
          extra: {
            max: config.get<number>('DB_POOL_MAX', 3),
            min: config.get<number>('DB_POOL_MIN', 1),
            connectionTimeoutMillis: config.get<number>(
              'DB_CONNECTION_TIMEOUT_MS',
              30_000,
            ),
            idleTimeoutMillis: config.get<number>('DB_IDLE_TIMEOUT_MS', 600_000),
            maxLifetimeSeconds: Math.ceil(
              config.get<number>('DB_MAX_LIFETIME_MS', 1_800_000) / 1000,
            ),
          },
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
    MailModule,
    MapModule,
  ],
})
export class AppModule {}
