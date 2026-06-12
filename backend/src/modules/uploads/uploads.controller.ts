import {
  Controller,
  BadRequestException,
  ForbiddenException,
  Param,
  ParseEnumPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import {
  DRIVER_DOCUMENT_SUBDIR,
  DriverDocumentType,
} from './driver-document-type.enum';
import { UploadStorageService } from './upload-storage.service';

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly storage: UploadStorageService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar image is required');
    }
    return { url: await this.storage.storeImage(file, 'avatars') };
  }

  @Post('drivers/:documentType')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDriverDocument(
    @Req() req: Request & { user: { role: string } },
    @Param('documentType', new ParseEnumPipe(DriverDocumentType))
    documentType: DriverDocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (req.user.role !== 'driver') {
      throw new ForbiddenException('Driver account required');
    }
    if (!file) {
      throw new BadRequestException('Driver document image is required');
    }
    return {
      url: await this.storage.storeImage(
        file,
        DRIVER_DOCUMENT_SUBDIR[documentType],
      ),
    };
  }
}
