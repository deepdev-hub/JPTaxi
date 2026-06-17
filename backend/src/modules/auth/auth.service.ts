import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { Customer, GenderType } from '../../entities/customer.entity';
import {
  Driver,
  DriverJapaneseLevelEnum,
  DriverStatusType,
} from '../../entities/driver.entity';
import { DriverLicense, LicenseTypeEnum } from '../../entities/driver-license.entity';
import { LoginHistory, LoginUserType } from '../../entities/login-history.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { Vehicle, VehicleTypeEnum } from '../../entities/vehicle.entity';
import { MailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import type { JwtValidatedUser } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { resolveRegistrationStatus } from '../drivers/driver-approval.policy';

@Injectable()
export class AuthService {
  private static readonly DEFAULT_BIRTH_DATE = '2000-01-01';

  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(Vehicle)
    private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(DriverLicense)
    private readonly licenses: Repository<DriverLicense>,
    @InjectRepository(LoginHistory)
    private readonly logins: Repository<LoginHistory>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const role = dto.role === 'driver' ? 'driver' : 'customer';
    const email = dto.email.trim().toLowerCase();
    if (
      (await this.customers.exist({ where: { email } })) ||
      (await this.drivers.exist({ where: { email } }))
    ) {
      throw new BadRequestException('Email is already registered');
    }
    if (
      (await this.customers.exist({ where: { phone: dto.phone } })) ||
      (await this.drivers.exist({ where: { phone: dto.phone } }))
    ) {
      throw new BadRequestException('Phone number is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const birthDate = dto.birth_date?.slice(0, 10) ?? AuthService.DEFAULT_BIRTH_DATE;
    if (role === 'driver') {
      if (!dto.license_plate || !dto.vehicle_type || !dto.license_number) {
        throw new BadRequestException('Driver vehicle and license information is required');
      }
      if (
        !dto.portrait_url
        || !dto.japanese_certificate_url
        || !dto.license_front_url
        || !dto.license_back_url
        || !dto.vehicle_photo_url
        || !dto.registration_paper_url
      ) {
        throw new BadRequestException(
          'Driver registration requires avatar, Japanese certificate, driver license images, vehicle photo, and registration paper.',
        );
      }
      const vehicleType = dto.vehicle_type as VehicleTypeEnum;
      if (!Object.values(VehicleTypeEnum).includes(vehicleType)) {
        throw new BadRequestException('Invalid vehicle type');
      }
      const driver = await this.drivers.save(this.drivers.create({
        firstName: dto.first_name,
        lastName: dto.last_name,
        email,
        passwordHash,
        phone: dto.phone,
        gender: dto.gender ?? GenderType.Other,
        birthDate,
        nationality: dto.nationality || 'Vietnam',
        idNumber: dto.id_number || null,
        isEmailVerified: false,
        isPhoneVerified: false,
        status: resolveRegistrationStatus(
          true,
        ),
        driverJapaneseLevel: dto.japanese_level ?? DriverJapaneseLevelEnum.N3,
        avatarUrl: dto.portrait_url,
        japaneseCertificateUrl: dto.japanese_certificate_url,
        isOnline: false,
        lastSeenAt: null,
        approvedAt: new Date(),
      }));
      await this.vehicles.save(this.vehicles.create({
        driverId: driver.driverId,
        vehicleType,
        licensePlate: dto.license_plate,
        brand: dto.vehicle_brand || '',
        color: dto.vehicle_color || '',
        manufactureYear: new Date().getFullYear(),
        vehiclePhotoUrl: dto.vehicle_photo_url || null,
        registrationPaperUrl: dto.registration_paper_url || null,
      }));
      const today = new Date().toISOString().slice(0, 10);
      await this.licenses.save(this.licenses.create({
        driverId: driver.driverId,
        licenseType: dto.license_type ?? LicenseTypeEnum.B,
        issueDate: today,
        issuePlace: dto.license_number,
        expiryDate: dto.license_expiry_date?.slice(0, 10) || today,
        frontImageUrl: dto.license_front_url || null,
        backImageUrl: dto.license_back_url || null,
      }));
      return this.login({ email, password: dto.password, role: 'driver' });
    }

    const customer = await this.customers.save(this.customers.create({
      firstName: dto.first_name,
      lastName: dto.last_name,
      email,
      passwordHash,
      phone: dto.phone,
      gender: dto.gender ?? GenderType.Other,
      birthDate,
      isEmailVerified: false,
      isPhoneVerified: false,
      avatarUrl: null,
    }));
    return this.session(customer.customerId, 'customer', customer.email, customer.firstName);
  }

  async login(
    dto: LoginDto,
    clientIp?: string | null,
    userAgent?: string | null,
  ) {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? 'customer';
    const repository = role === 'driver' ? this.drivers : this.customers;
    const account = await repository
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('LOWER(account.email) = :email', { email })
      .getOne();
    if (!account || !(await bcrypt.compare(dto.password, account.passwordHash))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    const id = role === 'driver'
      ? (account as Driver).driverId
      : (account as Customer).customerId;
    await this.logins.save(this.logins.create({
      userType: role === 'driver' ? LoginUserType.driver : LoginUserType.customer,
      userId: id,
      ipAddress: clientIp || null,
      userAgent: userAgent?.slice(0, 512) || null,
      loginTime: new Date(),
    }));
    return this.session(id, role, account.email, account.firstName);
  }

  async getMe(user: JwtValidatedUser) {
    const account = user.role === 'driver'
      ? await this.drivers.findOne({ where: { driverId: user.id } })
      : await this.customers.findOne({ where: { customerId: user.id } });
    if (!account) throw new NotFoundException('Account not found');
    return { ...account, role: user.role };
  }

  async changePassword(user: JwtValidatedUser, dto: ChangePasswordDto) {
    const role = user.role === 'driver' ? 'driver' : 'customer';
    const repository = role === 'driver' ? this.drivers : this.customers;
    const idColumn = role === 'driver' ? 'driver_id' : 'customer_id';
    const account = await repository
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where(`account.${idColumn} = :id`, { id: user.id })
      .getOne();
    if (!account || !(await bcrypt.compare(dto.currentPassword, account.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    account.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    if (role === 'driver') {
      await this.drivers.save(account as Driver);
    } else {
      await this.customers.save(account as Customer);
    }
    return { message: 'Password changed successfully' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const customer = await this.customers.findOne({ where: { email } });
    const driver = customer ? null : await this.drivers.findOne({ where: { email } });
    const account = customer ?? driver;
    if (account) {
      const userType = customer ? 'customer' : 'driver';
      const userId = customer ? customer.customerId : driver!.driverId;
      const code = randomInt(100000, 1000000).toString();
      await this.resetTokens.delete({ userType, userId });
      await this.resetTokens.save(this.resetTokens.create({
        userType,
        userId,
        tokenHash: this.hashResetCode(code),
        expiresAt: new Date(
          Date.now() +
          this.config.get<number>('PASSWORD_RESET_EXPIRATION_MINUTES', 30) *
          60 *
          1000,
        ),
        usedAt: null,
      }));
      await this.mail.sendPasswordReset(email, code);
    }
    return { message: 'If the account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const customer = await this.customers.findOne({ where: { email } });
    const driver = customer ? null : await this.drivers.findOne({ where: { email } });
    if (!customer && !driver) throw new BadRequestException('Invalid or expired reset code');
    const userType = customer ? 'customer' : 'driver';
    const userId = customer ? customer.customerId : driver!.driverId;
    const entry = await this.resetTokens.findOne({
      where: { userType, userId, tokenHash: this.hashResetCode(dto.code.trim()) },
      order: { createdAt: 'DESC' },
    });
    if (!entry || entry.usedAt || entry.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset code');
    }
    if (customer) {
      customer.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await this.customers.save(customer);
    } else {
      driver!.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      await this.drivers.save(driver!);
    }
    entry.usedAt = new Date();
    await this.resetTokens.save(entry);
    return { message: 'Password reset successfully' };
  }

  private session(id: number, role: 'customer' | 'driver', email: string, name: string) {
    return {
      token: this.jwt.sign({ id, role }),
      role,
      user: {
        id,
        email,
        name,
        customerId: role === 'customer' ? id : undefined,
        driverId: role === 'driver' ? id : undefined,
      },
    };
  }

  private hashResetCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
