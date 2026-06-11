import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { CustomerPaymentMethod } from '../../entities/customer-payment-method.entity';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Invoice } from '../../entities/invoice.entity';
import { PaymentTransaction } from '../../entities/payment-transaction.entity';
import { Trip } from '../../entities/trip.entity';
import { AuthModule } from '../auth/auth.module';
import { MailModule } from '../mail/mail.module';
import {
  InvoiceActionsController,
  InvoicesController,
} from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      PaymentTransaction,
      Customer,
      CustomerPaymentMethod,
      Driver,
      Invoice,
      AuditLog,
    ]),
    AuthModule,
    MailModule,
  ],
  controllers: [InvoicesController, InvoiceActionsController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
