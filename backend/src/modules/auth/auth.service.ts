import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Customer, GenderType } from '../../entities/customer.entity';
import { Driver, DriverJapaneseLevelEnum, DriverStatusType } from '../../entities/driver.entity';
import { DriverLicense, LicenseTypeEnum } from '../../entities/driver-license.entity';
import { LoginHistory, LoginUserType } from '../../entities/login-history.entity';
import { Vehicle, VehicleTypeEnum } from '../../entities/vehicle.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private forgotPasswordCodes = new Map<string, { code: string; expiresAt: Date }>();

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
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const role = dto.role === 'driver' ? 'driver' : 'customer';
      const normalizedEmail = dto.email.trim().toLowerCase();
      const emailExists =
        (await this.customers.exist({ where: { email: normalizedEmail } })) ||
        (await this.drivers.exist({ where: { email: normalizedEmail } }));
      if (emailExists) {
        throw new BadRequestException('このメールアドレスはすでに登録されています。');
      }

      const phoneExists =
        (await this.customers.exist({ where: { phone: dto.phone } })) ||
        (await this.drivers.exist({ where: { phone: dto.phone } }));
      if (phoneExists) {
        throw new BadRequestException('この電話番号はすでに登録されています。');
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const birthDate = dto.birth_date?.slice(0, 10) ?? '1990-01-01';

      if (role === 'driver') {
        if (!dto.license_plate || !dto.vehicle_type || !dto.license_number) {
          throw new BadRequestException('ドライバー登録には免許証番号、車両タイプ、ナンバープレートが必要です。');
        }
        const vehicleType = dto.vehicle_type as VehicleTypeEnum;
        if (!Object.values(VehicleTypeEnum).includes(vehicleType)) {
          throw new BadRequestException('車両タイプが正しくありません。');
        }
        if (await this.vehicles.exist({ where: { licensePlate: dto.license_plate } })) {
          throw new BadRequestException('このナンバープレートはすでに登録されています。');
        }

        const driverEntity = this.drivers.create({
          firstName: dto.first_name,
          lastName: dto.last_name,
          email: normalizedEmail,
          passwordHash,
          phone: dto.phone,
          gender: dto.gender ?? GenderType.Other,
          birthDate,
          nationality: dto.nationality || 'Vietnam',
          idNumber: dto.id_number || null,
          isEmailVerified: false,
          isPhoneVerified: false,
          status: DriverStatusType.approved,
          driverJapaneseLevel: dto.japanese_level ?? DriverJapaneseLevelEnum.N3,
          avatarUrl: dto.portrait_url || null,
        });
        const savedDriver = await this.drivers.save(driverEntity);

        await this.vehicles.save(
          this.vehicles.create({
            driverId: savedDriver.driverId,
            vehicleType,
            licensePlate: dto.license_plate,
            brand: dto.vehicle_brand || 'Toyota',
            color: dto.vehicle_color || '',
            manufactureYear: new Date().getFullYear(),
            vehiclePhotoUrl: dto.vehicle_photo_url || null,
            registrationPaperUrl: dto.registration_paper_url || null,
          }),
        );

        const today = new Date().toISOString().slice(0, 10);
        await this.licenses.save(
          this.licenses.create({
            driverId: savedDriver.driverId,
            licenseType: dto.license_type ?? LicenseTypeEnum.B,
            issueDate: today,
            issuePlace: dto.license_number,
            expiryDate: dto.license_expiry_date?.slice(0, 10) || today,
            frontImageUrl: dto.license_front_url || null,
            backImageUrl: dto.license_back_url || null,
          }),
        );

        const token = this.jwt.sign({ id: savedDriver.driverId, role: 'driver' }, { expiresIn: '7d' });
        const { passwordHash: _p, ...user } = savedDriver as Driver & { passwordHash?: string };
        return {
          message: 'ドライバー登録が完了しました。',
          token,
          role: 'driver',
          user: {
            ...user,
            driverId: savedDriver.driverId,
            email: savedDriver.email,
            name: savedDriver.firstName,
          },
        };
      }

      const customerEntity = this.customers.create({
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: normalizedEmail,
        passwordHash,
        phone: dto.phone,
        gender: dto.gender ?? GenderType.Other,
        birthDate,
        isEmailVerified: false,
        isPhoneVerified: false,
      });
      const savedCustomer = await this.customers.save(customerEntity);
      const token = this.jwt.sign({ id: savedCustomer.customerId, role: 'customer' }, { expiresIn: '7d' });
      const { passwordHash: _p, ...user } = savedCustomer as Customer & { passwordHash?: string };
      return {
        message: '登録が完了しました。',
        token,
        role: 'customer',
        user: {
          ...user,
          customerId: savedCustomer.customerId,
          email: savedCustomer.email,
          name: savedCustomer.firstName,
        },
      };
    } catch (e: unknown) {
      if (e instanceof BadRequestException) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : '不明なエラーが発生しました。';
      throw new BadRequestException(msg);
    }
  }

  async login(dto: LoginDto, clientIp?: string | null) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const preferredRole = dto.role ?? (normalizedEmail.includes('driver') || normalizedEmail.includes('taxi')
      ? 'driver'
      : 'customer');

    const customer = await this.customers
      .createQueryBuilder('c')
      .addSelect('c.passwordHash')
      .where('LOWER(c.email) = :email', { email: normalizedEmail })
      .getOne();
    const driver = await this.drivers
      .createQueryBuilder('d')
      .addSelect('d.passwordHash')
      .where('LOWER(d.email) = :email', { email: normalizedEmail })
      .getOne();

    const candidates = preferredRole === 'driver'
      ? [
          { userType: LoginUserType.driver, user: driver },
          { userType: LoginUserType.customer, user: customer },
        ]
      : [
          { userType: LoginUserType.customer, user: customer },
          { userType: LoginUserType.driver, user: driver },
        ];
    const allowedCandidates = dto.role
      ? candidates.filter((candidate) => candidate.userType === dto.role)
      : candidates;

    for (const candidate of allowedCandidates) {
      const user = candidate.user;
      if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        continue;
      }

      const isDriver = candidate.userType === LoginUserType.driver;
      const userId = isDriver
        ? (user as Driver).driverId
        : (user as Customer).customerId;
      const role = isDriver ? 'driver' : 'customer';

      try {
        await this.logins.save(
          this.logins.create({
            userType: candidate.userType,
            userId,
            ipAddress: clientIp || null,
            loginTime: new Date(),
          }),
        );
      } catch {
        /* login history is non-critical */
      }

      const token = this.jwt.sign({ id: userId, role }, { expiresIn: '7d' });
      return {
        token,
        role,
        user: {
          email: user.email,
          name: user.firstName,
          customerId: isDriver ? undefined : userId,
          driverId: isDriver ? userId : undefined,
        },
      };
    }

    throw new UnauthorizedException('メールアドレスまたはパスワードが正しくありません。');
  }

  async getProfile(customerId: number) {
    const user = await this.customers.findOne({
      where: { customerId },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const emailLower = dto.email.trim().toLowerCase();
    const customer = await this.customers.findOne({
      where: { email: emailLower },
    });

    if (!customer) {
      throw new NotFoundException('このメールアドレスのアカウントが見つかりません。');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.forgotPasswordCodes.set(emailLower, { code, expiresAt });

    console.log('\n==================================================');
    console.log('[MOCK MAIL SENDER] EMAIL RESET PASSWORD SENT');
    console.log(`To: ${customer.lastName} ${customer.firstName} <${emailLower}>`);
    console.log('Subject: JP Taxi - パスワード再設定確認');
    console.log(`Body: パスワード再設定コード: ${code}`);
    console.log(`Expires: 15 minutes (${expiresAt.toLocaleTimeString()})`);
    console.log('==================================================\n');

    return {
      message: 'パスワード再設定コードを送信しました。',
      email: emailLower,
      mockSentCode: code,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const emailLower = dto.email.trim().toLowerCase();

    const customer = await this.customers.findOne({
      where: { email: emailLower },
    });

    if (!customer) {
      throw new NotFoundException('アカウントが見つかりません。');
    }

    const entry = this.forgotPasswordCodes.get(emailLower);
    if (!entry) {
      throw new BadRequestException('確認コードが存在しないか、有効期限が切れています。');
    }

    if (entry.expiresAt < new Date()) {
      this.forgotPasswordCodes.delete(emailLower);
      throw new BadRequestException('確認コードの有効期限が切れています。');
    }

    if (entry.code !== dto.code.trim()) {
      throw new BadRequestException('確認コードが正しくありません。');
    }

    customer.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.customers.save(customer);
    this.forgotPasswordCodes.delete(emailLower);

    return {
      message: 'パスワードを再設定しました。',
    };
  }
}
