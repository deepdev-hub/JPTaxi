import {
  Body,
  Controller,
  Delete,
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
import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import {
  CreatePaymentMethodDto,
  CreateSearchHistoryDto,
  UpdateNotificationPreferencesDto,
  UpsertSavedPlaceDto,
} from './dto/customer-settings.dto';
import type { JwtValidatedUser } from '../auth/jwt.strategy';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('customer')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get('me/profile')
  getProfile(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getProfile(req.user.id);
  }

  @Put('me/profile')
  updateProfile(
    @Req() req: Request & { user: JwtValidatedUser },
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customers.updateProfile(req.user.id, dto);
  }

  @Get('me/login-history')
  getLoginHistory(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getLoginHistory(req.user.id);
  }

  @Get('me/saved-places')
  getSavedPlaces(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getSavedPlaces(req.user.id);
  }

  @Put('me/saved-places/:type')
  upsertSavedPlace(
    @Req() req: Request & { user: JwtValidatedUser },
    @Param('type') type: string,
    @Body() dto: UpsertSavedPlaceDto,
  ) {
    return this.customers.upsertSavedPlace(req.user.id, { ...dto, type: type as any });
  }

  @Delete('me/saved-places/:id')
  deleteSavedPlace(
    @Req() req: Request & { user: JwtValidatedUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customers.deleteSavedPlace(req.user.id, id);
  }

  @Get('me/notification-preferences')
  getNotificationPreferences(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getNotificationPreferences(req.user.id);
  }

  @Put('me/notification-preferences')
  updateNotificationPreferences(
    @Req() req: Request & { user: JwtValidatedUser },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.customers.updateNotificationPreferences(req.user.id, dto);
  }

  @Get('me/payment-methods')
  getPaymentMethods(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getPaymentMethods(req.user.id);
  }

  @Post('me/payment-methods')
  addPaymentMethod(
    @Req() req: Request & { user: JwtValidatedUser },
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.customers.addPaymentMethod(req.user.id, dto);
  }

  @Delete('me/payment-methods/:id')
  deletePaymentMethod(
    @Req() req: Request & { user: JwtValidatedUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customers.deletePaymentMethod(req.user.id, id);
  }

  @Get('me/search-history')
  getSearchHistory(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.getSearchHistory(req.user.id);
  }

  @Post('me/search-history')
  addSearchHistory(
    @Req() req: Request & { user: JwtValidatedUser },
    @Body() dto: CreateSearchHistoryDto,
  ) {
    return this.customers.addSearchHistory(req.user.id, dto);
  }

  @Delete('me/search-history')
  clearSearchHistory(@Req() req: Request & { user: JwtValidatedUser }) {
    return this.customers.clearSearchHistory(req.user.id);
  }
}
