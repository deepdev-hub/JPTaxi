import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import {
  DRIVER_DOCUMENT_SUBDIR,
  DriverDocumentType,
} from './driver-document-type.enum';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_SUBDIR = 'avatars';

export interface StoredFileResult {
  /** URL công khai (path tương đối, phục vụ qua /uploads/) */
  url: string;
  /** Đường dẫn tương đối trong thư mục uploads (local) */
  storagePath: string;
  storage: 'local';
}

@Injectable()
export class UploadsService {
  private readonly uploadRoot: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadRoot = join(process.cwd(), 'uploads');
    this.publicBaseUrl =
      this.config.get<string>('UPLOAD_PUBLIC_BASE_URL')?.replace(/\/$/, '') ??
      '';
  }

  ensureDirectory(relativeDir: string): string {
    const abs = join(this.uploadRoot, relativeDir);
    if (!existsSync(abs)) {
      mkdirSync(abs, { recursive: true });
    }
    return abs;
  }

  validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('ファイルが選択されていません');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        'JPEG、PNG、WebP形式の画像のみアップロードできます',
      );
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('ファイルサイズは5MB以下にしてください');
    }
  }

  /** Avatar khách hàng / tài xế (cập nhật profile). */
  saveAvatar(file: Express.Multer.File): StoredFileResult {
    return this.saveImage(file, AVATAR_SUBDIR, 'avatar');
  }

  /** Ảnh hồ sơ đăng ký tài xế. */
  saveDriverDocument(
    file: Express.Multer.File,
    documentType: DriverDocumentType,
  ): StoredFileResult {
    return this.saveImage(file, DRIVER_DOCUMENT_SUBDIR[documentType], documentType);
  }

  /**
   * Lưu ảnh lên server local (uploads/).
   * Có thể mở rộng S3/GCS qua STORAGE_DRIVER=s3 và bucket env sau này.
   */
  private saveImage(
    file: Express.Multer.File,
    subdir: string,
    filenamePrefix: string,
  ): StoredFileResult {
    this.validateImageFile(file);
    this.ensureDirectory(subdir);

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${filenamePrefix}-${randomUUID()}${ext}`;
    const storagePath = join(subdir, filename).replace(/\\/g, '/');
    const absDest = join(this.uploadRoot, storagePath);

    if (file.path) {
      copyFileSync(file.path, absDest);
      try {
        unlinkSync(file.path);
      } catch {
        /* temp file có thể đã bị xóa bởi multer */
      }
    } else if (file.buffer) {
      writeFileSync(absDest, file.buffer);
    } else {
      throw new BadRequestException('ファイルの読み込みに失敗しました');
    }

    const urlPath = `/uploads/${storagePath}`;
    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl}${urlPath}`
      : urlPath;

    return { url, storagePath, storage: 'local' };
  }
}
