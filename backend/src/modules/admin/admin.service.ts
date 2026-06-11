import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Customer } from '../../entities/customer.entity';
import { Driver } from '../../entities/driver.entity';
import { Admin } from '../../entities/admin.entity';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Admin)
    private readonly admins: Repository<Admin>,
    private readonly jwt: JwtService,
  ) {}

  getAllDrivers() {
    return this.drivers.find();
  }

  getAllCustomers() {
    return this.customers.find();
  }

  async deleteDriver(id: string) {
    await this.drivers.delete({ driverId: parseInt(id, 10) });
    return { message: 'Đã xóa tài xế thành công' };
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('a.username = :username', { username: dto.username })
      .getOne();

    if (
      !admin ||
      !(await bcrypt.compare(dto.password, admin.passwordHash))
    ) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu');
    }

    const token = this.jwt.sign(
      { id: admin.adminId, role: 'admin' },
      { expiresIn: '7d' },
    );
    return {
      token,
      admin: { username: admin.username, role: admin.role },
    };
  }
}
