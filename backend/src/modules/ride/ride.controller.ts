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
import { RideService } from './ride.service';
import { EstimateDto } from './dto/estimate.dto';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import type { JwtValidatedUser } from '../auth/jwt.strategy';

type AuthedRequest = Request & { user: JwtValidatedUser };
import { RouteDto } from './dto/route.dto';

@Controller()
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post('estimate')
  calculateEstimate(@Body() body: EstimateDto) {
    const { startLat, startLng, endLat, endLng, vehicleType } = body;
    const distance =
      Math.sqrt(
        Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2),
      ) * 111;
    const time = Math.round((distance / 30) * 60);
    const rates: Record<string, number> = { '4': 12000, '7': 15000, '9': 20000 };
    const pricePerKm = rates[vehicleType ?? '4'] ?? 12000;
    const totalPrice = Math.round(distance * pricePerKm);

    return {
      distance_km: distance.toFixed(2),
      estimated_time_minutes: time,
      total_price: totalPrice,
      currency: 'VND',
    };
  }

  /**
   * Khách hàng đặt xe mới (hỗ trợ tự đi hoặc đặt hộ)
   */
  @Post('ride/request')
  @UseGuards(AuthGuard('jwt'))
  createRideRequest(
    @Req() req: AuthedRequest,
    @Body() dto: CreateRideRequestDto,
  ) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('Chỉ có khách hàng mới có thể thực hiện đặt xe.');
    }
    return this.rideService.createRequest(req.user.id, dto);
  }

  /**
   * Lấy thông tin cuốc xe/chuyến đi đang hoạt động
   */
  @Get('ride/active')
  @UseGuards(AuthGuard('jwt'))
  getActiveRide(@Req() req: AuthedRequest) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('Chỉ có khách hàng mới có thể lấy thông tin chuyến đi của mình.');
    }
    return this.rideService.getActiveRide(req.user.id);
  }

  @Get('ride/driver/pending')
  @UseGuards(AuthGuard('jwt'))
  getPendingRideForDriver(@Req() req: AuthedRequest) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('ドライバーのみ配車リクエストを確認できます。');
    }
    return this.rideService.getPendingRequestForDriver(req.user.id);
  }

  @Get('ride/driver/active')
  @UseGuards(AuthGuard('jwt'))
  getActiveRideForDriver(@Req() req: AuthedRequest) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Only drivers can get their active ride.');
    }
    return this.rideService.getActiveRideForDriver(req.user.id);
  }

  @Post('ride/driver/location')
  @UseGuards(AuthGuard('jwt'))
  updateDriverLocation(
    @Req() req: AuthedRequest,
    @Body() body: { lat: number; lng: number },
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Only drivers can update their location.');
    }
    return this.rideService.updateDriverLocation(req.user.id, Number(body.lat), Number(body.lng));
  }

  @Post('ride/driver/accept/:requestId')
  @UseGuards(AuthGuard('jwt'))
  acceptRideRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('ドライバーのみ配車リクエストを承認できます。');
    }
    return this.rideService.acceptRequest(req.user.id, requestId);
  }

  @Post('ride/driver/reject/:requestId')
  @UseGuards(AuthGuard('jwt'))
  rejectRideRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('ドライバーのみ配車リクエストを拒否できます。');
    }
    return this.rideService.rejectPendingRequest(req.user.id, requestId);
  }

  @Post('ride/driver/request-payment/:tripId')
  @UseGuards(AuthGuard('jwt'))
  requestPaymentFromDriver(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('ドライバーのみ請求書を発行できます。');
    }
    return this.rideService.requestPaymentFromDriver(req.user.id, tripId);
  }

  @Post('ride/driver/cancel/:tripId')
  @UseGuards(AuthGuard('jwt'))
  cancelAcceptedRideByDriver(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('ドライバーのみ乗車をキャンセルできます。');
    }
    return this.rideService.cancelAcceptedRideByDriver(req.user.id, tripId);
  }

  /**
   * Hủy yêu cầu đặt xe khi đang tìm tài xế
   */
  @Post('ride/cancel/:requestId')
  @UseGuards(AuthGuard('jwt'))
  cancelRideRequest(
    @Req() req: AuthedRequest,
    @Param('requestId', ParseIntPipe) requestId: number,
  ) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('Chỉ có khách hàng mới có thể hủy đặt xe.');
    }
    return this.rideService.cancelRequest(req.user.id, requestId);
  }

  /**
   * Khách hàng thực hiện thanh toán chuyến đi
   */
  @Post('ride/pay')
  @UseGuards(AuthGuard('jwt'))
  processRidePayment(
    @Req() req: AuthedRequest,
    @Body() dto: ProcessPaymentDto,
  ) {
    if (req.user.role !== 'customer') {
      throw new ForbiddenException('Chỉ có khách hàng mới có quyền thực hiện thanh toán.');
    }
    return this.rideService.processPayment(req.user.id, dto);
  }

  /** Tọa độ lộ trình từ điểm xuất phát đến đích (mock polyline). */
  @Post('route')
  getRoute(@Body() body: RouteDto) {
    const { startLat, startLng, endLat, endLng } = body;

    // Tạo polyline giả lập đơn giản (có thể thay bằng Google/OSRM sau)
    const routeCoordinates = this.generateRouteCoordinates(
      startLat,
      startLng,
      endLat,
      endLng,
    );

    const distance =
      Math.sqrt(
        Math.pow(endLat - startLat, 2) + Math.pow(endLng - startLng, 2),
      ) * 111;

    return {
      distance_km: Number(distance.toFixed(2)),
      duration_minutes: Math.round((distance / 30) * 60),
      route: routeCoordinates,           // array of [lat, lng]
      polyline: this.encodePolyline(routeCoordinates), // optional
    };
  }

  private generateRouteCoordinates(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): [number, number][] {
    const points: [number, number][] = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const lat = startLat + (endLat - startLat) * (i / steps);
      const lng = startLng + (endLng - startLng) * (i / steps);
      points.push([Number(lat.toFixed(6)), Number(lng.toFixed(6))]);
    }
    return points;
  }

  private encodePolyline(points: [number, number][]): string {
    // Simple placeholder - có thể thay bằng thư viện polyline sau
    return 'mock_polyline_' + points.length;
  }
}
