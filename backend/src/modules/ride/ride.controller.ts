import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { EstimateDto } from './dto/estimate.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RideService } from './ride.service';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('rides')
export class RideController {
  constructor(private readonly rides: RideService) {}

  @Post('estimate')
  @UseGuards(AuthGuard('jwt'))
  estimate(@Body() dto: EstimateDto) {
    return this.rides.estimate(dto);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: AuthedRequest, @Body() dto: CreateRideRequestDto) {
    this.assertRole(req.user, 'customer');
    return this.rides.createRequest(req.user.id, dto);
  }

  @Get('active')
  @UseGuards(AuthGuard('jwt'))
  getActive(@Req() req: AuthedRequest) {
    this.assertRole(req.user, 'customer');
    return this.rides.getActiveRide(req.user.id);
  }

  @Get('driver/pending')
  @UseGuards(AuthGuard('jwt'))
  getDriverPending(@Req() req: AuthedRequest) {
    this.assertRole(req.user, 'driver');
    return this.rides.getPendingRequestForDriver(req.user.id);
  }

  @Get('driver/active')
  @UseGuards(AuthGuard('jwt'))
  getDriverActive(@Req() req: AuthedRequest) {
    this.assertRole(req.user, 'driver');
    return this.rides.getActiveRideForDriver(req.user.id);
  }

  @Post('driver/location')
  @UseGuards(AuthGuard('jwt'))
  updateDriverLocation(
    @Req() req: AuthedRequest,
    @Body() body: { lat: number; lng: number },
  ) {
    this.assertRole(req.user, 'driver');
    return this.rides.updateDriverLocation(
      req.user.id,
      Number(body.lat),
      Number(body.lng),
    );
  }

  @Post('driver/accept/:requestId')
  @UseGuards(AuthGuard('jwt'))
  accept(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    this.assertRole(req.user, 'driver');
    return this.rides.acceptRequest(req.user.id, requestId);
  }

  @Post('driver/reject/:requestId')
  @UseGuards(AuthGuard('jwt'))
  reject(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    this.assertRole(req.user, 'driver');
    return this.rides.rejectPendingRequest(req.user.id, requestId);
  }

  @Post('driver/request-payment/:tripId')
  @UseGuards(AuthGuard('jwt'))
  requestPayment(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    this.assertRole(req.user, 'driver');
    return this.rides.requestPaymentFromDriver(req.user.id, tripId);
  }

  @Post('driver/cancel/:tripId')
  @UseGuards(AuthGuard('jwt'))
  cancelByDriver(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    this.assertRole(req.user, 'driver');
    return this.rides.cancelAcceptedRideByDriver(req.user.id, tripId);
  }

  @Post('cancel/:requestId')
  @UseGuards(AuthGuard('jwt'))
  cancelByCustomer(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    this.assertRole(req.user, 'customer');
    return this.rides.cancelRequest(req.user.id, requestId);
  }

  @Post('payment')
  @UseGuards(AuthGuard('jwt'))
  pay(@Req() req: AuthedRequest, @Body() dto: ProcessPaymentDto) {
    this.assertRole(req.user, 'customer');
    return this.rides.processPaymentTransactional(req.user.id, dto);
  }

  private assertRole(user: JwtValidatedUser, role: 'customer' | 'driver') {
    if (user.role !== role) {
      throw new ForbiddenException(`${role} account required`);
    }
  }
}
