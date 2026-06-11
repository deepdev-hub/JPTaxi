import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { RideRequestsService } from './ride-requests.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestStatusDto } from './dto/update-ride-request-status.dto';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller('ride-requests')
export class RideRequestsController {
  constructor(private readonly rideRequests: RideRequestsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: AuthedRequest, @Body() dto: CreateRideRequestDto) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('予約作成は顧客アカウントのみ利用できます');
    }
    return this.rideRequests.createForCustomer(req.user.id, dto);
  }

  @Get('dispatches/me/pending')
  @UseGuards(AuthGuard('jwt'))
  getMyPendingDispatch(@Req() req: AuthedRequest) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('配車確認はドライバーのみ利用できます');
    }
    return this.rideRequests.getPendingDispatchForDriver(req.user.id);
  }

  @Get(':requestId')
  @UseGuards(AuthGuard('jwt'))
  getOne(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    return this.rideRequests.getById(requestId, req.user.id, req.user.role);
  }

  @Patch(':requestId/status')
  @UseGuards(AuthGuard('jwt'))
  updateStatus(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: UpdateRideRequestStatusDto,
  ) {
    return this.rideRequests.updateStatus(
      requestId,
      req.user.id,
      req.user.role,
      dto,
    );
  }

  @Post('dispatches/:dispatchId/accept')
  @UseGuards(AuthGuard('jwt'))
  acceptDispatch(
    @Req() req: AuthedRequest,
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('配車承認はドライバーのみ利用できます');
    }
    return this.rideRequests.acceptDispatch(dispatchId, req.user.id);
  }

  @Post('dispatches/:dispatchId/reject')
  @UseGuards(AuthGuard('jwt'))
  rejectDispatch(
    @Req() req: AuthedRequest,
    @Param('dispatchId', ParseIntPipe) dispatchId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('配車拒否はドライバーのみ利用できます');
    }
    return this.rideRequests.rejectDispatch(dispatchId, req.user.id);
  }
}
