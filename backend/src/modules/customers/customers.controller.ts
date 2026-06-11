import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get(':customerId/profile')
  getProfile(@Param('customerId', ParseIntPipe) customerId: number) {
    return this.customers.getProfile(customerId);
  }

  @Put(':customerId/profile')
  updateProfile(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customers.updateProfile(customerId, dto);
  }
}
