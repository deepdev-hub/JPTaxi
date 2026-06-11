import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Driver, DriverStatusType } from '../../entities/driver.entity';
import { DriverLicense } from '../../entities/driver-license.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { DriverDocumentType } from '../uploads/driver-document-type.enum';
import { UploadsService } from '../uploads/uploads.service';
import { RegisterDriverApplicationDto } from './dto/register-driver-application.dto';

export interface DriverRegistrationFiles {
  portrait: Express.Multer.File[];
  licenseFront: Express.Multer.File[];
  licenseBack: Express.Multer.File[];
  vehiclePhoto: Express.Multer.File[];
  registrationPaper: Express.Multer.File[];
}

@Injectable()
export class DriversRegistrationService {
  constructor(
    @InjectRepository(Driver)
    private readonly drivers: Repository<Driver>,
    private readonly uploads: UploadsService,
    private readonly dataSource: DataSource,
  ) {}

  async submitApplication(
    dto: RegisterDriverApplicationDto,
    files: DriverRegistrationFiles,
  ) {
    this.assertRequiredFiles(files);

    const emailTaken = await this.drivers.exists({ where: { email: dto.email } });
    if (emailTaken) {
      throw new ConflictException('このメールアドレスは既に登録されています');
    }

    const phoneTaken = await this.drivers.exists({ where: { phone: dto.phone } });
    if (phoneTaken) {
      throw new ConflictException('この電話番号は既に登録されています');
    }

    const plateTaken = await this.dataSource
      .getRepository(Vehicle)
      .exists({ where: { licensePlate: dto.licensePlate } });
    if (plateTaken) {
      throw new ConflictException('このナンバープレートは既に登録されています');
    }

    const portrait = this.uploads.saveDriverDocument(
      files.portrait[0],
      DriverDocumentType.portrait,
    );
    const licenseFront = this.uploads.saveDriverDocument(
      files.licenseFront[0],
      DriverDocumentType.license_front,
    );
    const licenseBack = this.uploads.saveDriverDocument(
      files.licenseBack[0],
      DriverDocumentType.license_back,
    );
    const vehiclePhoto = this.uploads.saveDriverDocument(
      files.vehiclePhoto[0],
      DriverDocumentType.vehicle_photo,
    );
    const registrationPaper = this.uploads.saveDriverDocument(
      files.registrationPaper[0],
      DriverDocumentType.registration_paper,
    );

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const driver = await this.dataSource.transaction(async (manager) => {
      const driverRepo = manager.getRepository(Driver);
      const licenseRepo = manager.getRepository(DriverLicense);
      const vehicleRepo = manager.getRepository(Vehicle);

      const savedDriver = await driverRepo.save(
        driverRepo.create({
          lastName: dto.lastName,
          firstName: dto.firstName,
          gender: dto.gender,
          birthDate: dto.birthDate.slice(0, 10),
          phone: dto.phone,
          email: dto.email,
          passwordHash,
          nationality: dto.nationality,
          idNumber: dto.idNumber ?? null,
          isEmailVerified: true,
          isPhoneVerified: true,
          status: DriverStatusType.approved,
          approvedBy: null,
          approvedAt: new Date(),
          avatarUrl: portrait.url,
          driverJapaneseLevel: dto.japaneseLevel,
        }),
      );

      await licenseRepo.save(
        licenseRepo.create({
          driverId: savedDriver.driverId,
          licenseType: dto.licenseType,
          issueDate: dto.licenseIssueDate.slice(0, 10),
          issuePlace: dto.licenseIssuePlace ?? null,
          expiryDate: dto.licenseExpiryDate.slice(0, 10),
          frontImageUrl: licenseFront.url,
          backImageUrl: licenseBack.url,
        }),
      );

      await vehicleRepo.save(
        vehicleRepo.create({
          driverId: savedDriver.driverId,
          vehicleType: dto.vehicleType,
          licensePlate: dto.licensePlate,
          brand: dto.vehicleBrand,
          color: dto.vehicleColor,
          manufactureYear: dto.manufactureYear,
          vehiclePhotoUrl: vehiclePhoto.url,
          registrationPaperUrl: registrationPaper.url,
        }),
      );

      return savedDriver;
    });

    return {
      message: '登録が完了しました。ログインしてご利用ください',
      application: {
        driverId: driver.driverId,
        status: driver.status,
        email: driver.email,
      },
      documents: {
        portrait: portrait.url,
        licenseFront: licenseFront.url,
        licenseBack: licenseBack.url,
        vehiclePhoto: vehiclePhoto.url,
        registrationPaper: registrationPaper.url,
      },
      storage: 'local' as const,
    };
  }

  private assertRequiredFiles(files: DriverRegistrationFiles): void {
    const missing: string[] = [];
    if (!files.portrait?.[0]) missing.push('portrait');
    if (!files.licenseFront?.[0]) missing.push('licenseFront');
    if (!files.licenseBack?.[0]) missing.push('licenseBack');
    if (!files.vehiclePhoto?.[0]) missing.push('vehiclePhoto');
    if (!files.registrationPaper?.[0]) missing.push('registrationPaper');

    if (missing.length > 0) {
      throw new BadRequestException(
        `必須の画像ファイルが不足しています: ${missing.join(', ')}`,
      );
    }
  }
}
