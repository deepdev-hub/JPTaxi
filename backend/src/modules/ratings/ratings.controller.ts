import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { SubmitRatingDto } from './dto/submit-rating.dto';
import { RatingsService } from './ratings.service';

type AuthedRequest = Request & { user: JwtValidatedUser };

@Controller()
export class RatingsController {
  constructor(private readonly ratings: RatingsService) {}

  /** Khách hàng: dữ liệu màn đánh giá tài xế */
  @Get('trips/:tripId/rating/review-context')
  @UseGuards(AuthGuard('jwt'))
  getReviewContext(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    return this.ratings.getReviewContext(tripId, req.user);
  }

  /** Xem đánh giá của một chuyến (khách / tài xế liên quan) */
  @Get('trips/:tripId/rating')
  @UseGuards(AuthGuard('jwt'))
  getTripRating(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
  ) {
    return this.ratings.getTripRating(tripId, req.user);
  }

  /** Khách gửi đánh giá mới */
  @Post('trips/:tripId/rating')
  @UseGuards(AuthGuard('jwt'))
  createRating(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratings.createRating(tripId, req.user, dto);
  }

  /** Khách cập nhật đánh giá đã gửi */
  @Put('trips/:tripId/rating')
  @UseGuards(AuthGuard('jwt'))
  updateRating(
    @Req() req: AuthedRequest,
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() dto: SubmitRatingDto,
  ) {
    return this.ratings.updateRating(tripId, req.user, dto);
  }

  /** Tài xế: tóm tắt điểm trung bình */
  @Get('drivers/me/ratings/summary')
  @UseGuards(AuthGuard('jwt'))
  getMySummary(@Req() req: AuthedRequest) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Chỉ tài xế mới truy cập được.');
    }
    return this.ratings.getDriverRatingsSummary(req.user.id);
  }

  /** Tài xế: danh sách đánh giá & bình luận nhận được */
  @Get('drivers/me/ratings')
  @UseGuards(AuthGuard('jwt'))
  listMyRatings(
    @Req() req: AuthedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Chỉ tài xế mới truy cập được.');
    }
    return this.ratings.listDriverRatings(
      req.user.id,
      req.user,
      limit != null ? Number(limit) : 20,
      offset != null ? Number(offset) : 0,
    );
  }

  /** Công khai: tóm tắt đánh giá tài xế (tìm xe, hồ sơ) */
  @Get('drivers/:driverId/ratings/summary')
  getDriverSummary(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.ratings.getDriverRatingsSummary(driverId);
  }
}
