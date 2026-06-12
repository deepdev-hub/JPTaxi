import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { ApplyDriverDto } from './dto/apply-driver.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateDriverDocumentsDto } from './dto/update-driver-documents.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { DriversService } from './drivers.service';
import { UpdateDriverInsuranceDto } from './dto/update-driver-insurance.dto';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('drivers')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get('me/profile')
  @UseGuards(AuthGuard('jwt'))
  getMyProfile(@Req() req: AuthedRequest) {
    this.assertDriver(req.user);
    return this.drivers.getProfile(req.user.id);
  }

  @Put('me/profile')
  @UseGuards(AuthGuard('jwt'))
  updateMyProfile(@Req() req: AuthedRequest, @Body() dto: UpdateDriverProfileDto) {
    this.assertDriver(req.user);
    return this.drivers.updateProfile(req.user.id, dto);
  }

  @Put('me/bank-account')
  @UseGuards(AuthGuard('jwt'))
  updateMyBank(@Req() req: AuthedRequest, @Body() dto: UpdateBankAccountDto) {
    this.assertDriver(req.user);
    return this.drivers.updateBankAccount(req.user.id, dto);
  }

  @Put('me/documents')
  @UseGuards(AuthGuard('jwt'))
  updateMyDocuments(@Req() req: AuthedRequest, @Body() dto: UpdateDriverDocumentsDto) {
    this.assertDriver(req.user);
    return this.drivers.updateDocuments(req.user.id, dto);
  }

  @Put('me/availability')
  @UseGuards(AuthGuard('jwt'))
  setAvailability(@Req() req: AuthedRequest, @Body('isOnline') isOnline: boolean) {
    this.assertDriver(req.user);
    return this.drivers.setAvailability(req.user.id, Boolean(isOnline));
  }

  @Get('me/payouts')
  @UseGuards(AuthGuard('jwt'))
  getPayouts(@Req() req: AuthedRequest) {
    this.assertDriver(req.user);
    return this.drivers.getPayouts(req.user.id);
  }

  @Get('me/insurance')
  @UseGuards(AuthGuard('jwt'))
  getInsurance(@Req() req: AuthedRequest) {
    this.assertDriver(req.user);
    return this.drivers.getInsurance(req.user.id);
  }

  @Put('me/insurance')
  @UseGuards(AuthGuard('jwt'))
  updateInsurance(
    @Req() req: AuthedRequest,
    @Body() dto: UpdateDriverInsuranceDto,
  ) {
    this.assertDriver(req.user);
    return this.drivers.updateInsurance(req.user.id, dto);
  }

  @Post('me/apply')
  @UseGuards(AuthGuard('jwt'))
  apply(@Req() req: AuthedRequest, @Body() dto: ApplyDriverDto) {
    this.assertDriver(req.user);
    return this.drivers.applyToBeDriver(req.user.id, dto);
  }

  @Get(':driverId/profile')
  getPublicProfile(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.drivers.getPublicProfile(driverId);
  }

  @Post('admin/approve/:driverId')
  @UseGuards(AuthGuard('jwt'))
  approveDriver(
    @Req() req: AuthedRequest,
    @Param('driverId', ParseIntPipe) driverId: number,
    @Body('status') status: 'approved' | 'rejected',
    @Body('reason') reason?: string,
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException();
    return this.drivers.approveDriver(driverId, status, reason);
  }

  private assertDriver(user: JwtValidatedUser) {
    if (user.role !== 'driver') throw new ForbiddenException('Driver account required');
  }
}
