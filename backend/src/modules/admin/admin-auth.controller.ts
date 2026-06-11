import { Body, Controller, Post } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly admin: AdminService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto);
  }
}
