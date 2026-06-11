import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('drivers')
  getAllDrivers() {
    return this.admin.getAllDrivers();
  }

  @Get('customers')
  getAllCustomers() {
    return this.admin.getAllCustomers();
  }

  @Delete('driver/:id')
  deleteDriver(@Param('id') id: string) {
    return this.admin.deleteDriver(id);
  }
}
