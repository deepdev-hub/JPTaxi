import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
  UseGuards,
  Post,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { SearchDriversQueryDto } from './dto/search-drivers.query.dto';
import { ApplyDriverDto } from './dto/apply-driver.dto';


import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  /** Tìm tài xế theo vị trí (lat/lng) và bộ lọc. Phải khai báo trước route `:driverId`. */
  @Get('search')
  searchDrivers(@Query() query: SearchDriversQueryDto) {
    return this.drivers.searchDrivers(query);
  }

  @Get('profile-by-email')
  getProfileByEmail(@Query('email') email: string) {
    return this.drivers.getProfileByEmail(email);
  }

  @Get(':driverId/profile')
  getProfile(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.drivers.getProfile(driverId);
  }

  @Put(':driverId/profile')
  updateProfile(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.drivers.updateProfile(driverId, dto);
  }

  @Put(':driverId/bank-account')
  updateBank(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.drivers.updateBankAccount(driverId, dto);
  }

  @Put(':driverId/documents')
  updateDocuments(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body() dto: UpdateDriverDocumentsDto,
  ) {
    return this.drivers.updateDocuments(driverId, dto);
  }

// Logic kiểm tra điều kiện bắt buộc và gửi đơn xét duyệt
  @Post('apply')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver')
  async applyToBeDriver(
    @Req() req: { user: { id: number } },
    @Body() applyDto: ApplyDriverDto,
  ) {
    return this.drivers.applyToBeDriver(req.user.id, applyDto);
  }

  @Post('admin/approve/:driverId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async approveDriver(
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body('status') status: 'approved' | 'rejected',
    @Body('reason') reason?: string,
  ) {
    return this.drivers.approveDriver(driverId, status, reason);
  }
}
