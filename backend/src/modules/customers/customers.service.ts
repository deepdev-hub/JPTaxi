import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../entities/customer.entity';
import { LoginHistory, LoginUserType } from '../../entities/login-history.entity';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(LoginHistory)
    private readonly logins: Repository<LoginHistory>,
  ) {}

  private async loginHistoryFor(customerId: number) {
    const rows = await this.logins.find({
      where: { userType: LoginUserType.customer, userId: customerId },
      order: { loginTime: 'DESC' },
      take: 20,
    });
    return rows.map((r) => ({
      ipAddress: r.ipAddress,
      loginTime: r.loginTime,
    }));
  }

  async getProfile(customerId: number) {
    const c = await this.customers.findOne({ where: { customerId } });
    if (!c) throw new NotFoundException();
    const loginHistory = await this.loginHistoryFor(customerId);
    return {
      lastName: c.lastName,
      firstName: c.firstName,
      email: c.email,
      gender: c.gender,
      phone: c.phone,
      birthDate: c.birthDate,
      createdAt: c.createdAt,
      avatarUrl: c.avatarUrl,
      loginHistory,
    };
  }

  async updateProfile(customerId: number, dto: UpdateCustomerProfileDto) {
    const c = await this.customers.findOne({ where: { customerId } });
    if (!c) throw new NotFoundException();
    c.lastName = dto.lastName;
    c.firstName = dto.firstName;
    c.gender = dto.gender;
    if (dto.birthDate != null && dto.birthDate !== '') {
      c.birthDate = dto.birthDate.slice(0, 10);
    }
    c.phone = dto.phone;
    c.email = dto.email;
    if (dto.avatarUrl !== undefined) c.avatarUrl = dto.avatarUrl;
    await this.customers.save(c);
    return this.getProfile(customerId);
  }
}
