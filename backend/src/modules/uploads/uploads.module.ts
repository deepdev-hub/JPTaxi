import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { UploadStorageService } from './upload-storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: memoryStorage(),
        limits: {
          fileSize:
            config.get<number>('UPLOAD_MAX_FILE_SIZE_MB', 10) *
            1024 *
            1024,
        },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadStorageService],
})
export class UploadsModule {}
