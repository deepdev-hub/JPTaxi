import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  isBcryptHash,
  verifyPassword,
} from '../../common/password.util';
import { Driver, DriverStatusType } from '../../entities/driver.entity';
import { LoginHistory, LoginUserType } from '../../entities/login-history.entity';
import { LoginDto } from '../auth/dto/login.dto';

const SESSION_EXPIRES_IN = '7d';

@Injectable()
export class DriversAuthService {
  constructor(
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    @InjectRepository(LoginHistory)
    private readonly logins: Repository<LoginHistory>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto, clientIp?: string | null) {
    const email = dto.email.trim().toLowerCase();
    const driver = await this.drivers
      .createQueryBuilder('d')
      .addSelect('d.passwordHash')
      .where('LOWER(d.email) = :email', { email })
      .getOne();

    if (
      !driver ||
      !isBcryptHash(driver.passwordHash) ||
      !(await verifyPassword(dto.password, driver.passwordHash))
    ) {
      throw new UnauthorizedException(
        'メールアドレスまたはパスワードが正しくありません',
      );
    }

    this.assertDriverMayLogin(driver.status);

    try {
      await this.logins.save(
        this.logins.create({
          userType: LoginUserType.driver,
          userId: driver.driverId,
          ipAddress: clientIp ?? null,
          loginTime: new Date(),
        }),
      );
    } catch {
      /* bỏ qua nếu ghi login_history thất bại */
    }

    const token = this.jwt.sign(
      { id: driver.driverId, role: 'driver' },
      { expiresIn: SESSION_EXPIRES_IN },
    );

    return {
      token,
      tokenType: 'Bearer' as const,
      expiresIn: SESSION_EXPIRES_IN,
      session: {
        driverId: driver.driverId,
        role: 'driver' as const,
        status: driver.status,
      },
      user: {
        driverId: driver.driverId,
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        japaneseLevel: driver.driverJapaneseLevel,
        status: driver.status,
      },
    };
  }

  private assertDriverMayLogin(status: DriverStatusType): void {
    if (status === DriverStatusType.approved) {
      return;
    }
    if (status === DriverStatusType.pending) {
      throw new ForbiddenException(
        'アカウントは審査中です。承認後にログインできます',
      );
    }
    if (status === DriverStatusType.rejected) {
      throw new ForbiddenException('アカウントは承認されていません');
    }
    if (status === DriverStatusType.suspended) {
      throw new ForbiddenException('アカウントは停止されています');
    }
  }
}
