import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import {
  DRIVER_DOCUMENT_SUBDIR,
  DriverDocumentType,
} from './driver-document-type.enum';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const ext = extname(file.originalname).toLowerCase();
  const okMime =
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/webp';
  if (!okMime || !ALLOWED_EXT.has(ext)) {
    return cb(
      new BadRequestException(
        'JPEG、PNG、WebP形式の画像のみアップロードできます',
      ),
      false,
    );
  }
  cb(null, true);
}

export function multerDiskForSubdir(subdir: string) {
  const dest = join(process.cwd(), 'uploads', subdir);
  return diskStorage({
    destination: (
      _req: Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    },
    filename: (
      _req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

export function multerDiskForDriverDocument(documentType: DriverDocumentType) {
  return multerDiskForSubdir(DRIVER_DOCUMENT_SUBDIR[documentType]);
}
