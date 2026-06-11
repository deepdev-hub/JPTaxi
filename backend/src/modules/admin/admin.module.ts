import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Admin } from '../../entities/admin.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../common/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Customer, Admin]),
    AuthModule,
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
