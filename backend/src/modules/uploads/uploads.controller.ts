import {
  Controller,
  Param,
  ParseEnumPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import {
  DRIVER_DOCUMENT_SUBDIR,
  DriverDocumentType,
} from './driver-document-type.enum';

const uploadDir = (subdir: string) => {
  const destination = join(process.cwd(), 'uploads', subdir);
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }
  return destination;
};

const filename = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, filename: string) => void,
) => {
  const ext = extname(file.originalname) || '.bin';
  cb(null, `${randomUUID()}${ext}`);
};

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  cb(
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? null
      : new Error('Only JPEG, PNG, and WebP images are supported'),
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype),
  );
};

@Controller('uploads')
export class UploadsController {
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDir('avatars'),
        filename,
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { url: null };
    }
    return { url: `/uploads/avatars/${file.filename}` };
  }

  @Post('drivers/:documentType')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const documentType = req.params.documentType as DriverDocumentType;
          const subdir = DRIVER_DOCUMENT_SUBDIR[documentType];
          if (!subdir) {
            cb(new Error('Invalid driver document type'), '');
            return;
          }
          cb(null, uploadDir(subdir));
        },
        filename,
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: imageFileFilter,
    }),
  )
  uploadDriverDocument(
    @Param('documentType', new ParseEnumPipe(DriverDocumentType))
    documentType: DriverDocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { url: null };
    }
    return { url: `/uploads/${DRIVER_DOCUMENT_SUBDIR[documentType]}/${file.filename}` };
  }
}
