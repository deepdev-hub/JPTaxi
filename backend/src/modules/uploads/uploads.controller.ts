import {
  Controller,
  BadRequestException,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  DRIVER_DOCUMENT_SUBDIR,
  DriverDocumentType,
} from './driver-document-type.enum';
import { UploadStorageService } from './upload-storage.service';

@Controller('uploads')
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
    @Param('documentType', new ParseEnumPipe(DriverDocumentType))
    documentType: DriverDocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
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
