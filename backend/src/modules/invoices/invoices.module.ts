import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Trip } from '../../entities/trip.entity';
import { AuthModule } from '../auth/auth.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      PaymentTransaction,
      Customer,
      Driver,
      AuditLog,
    ]),
    AuthModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
