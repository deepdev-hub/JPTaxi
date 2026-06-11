import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { LoginHistory } from '../../entities/login-history.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, LoginHistory])],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
