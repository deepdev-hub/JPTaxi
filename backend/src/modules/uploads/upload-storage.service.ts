import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class UploadStorageService {
  constructor(private readonly config: ConfigService) {}

  async storeImage(file: Express.Multer.File, subdir: string): Promise<string> {
    const extension = imageExtensions[file.mimetype];
    if (!extension) {
      throw new BadRequestException(
        'Only JPEG, PNG, and WebP images are supported',
      );
    }
    const filename = `${randomUUID()}${extension}`;
    if (this.getUploadMode() === 'supabase_s3') {
      const key = `${subdir}/${filename}`;
      const client = this.createS3Client();
      await client.send(new PutObjectCommand({
        Bucket: this.config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      const publicUrl = this.config
        .getOrThrow<string>('SUPABASE_STORAGE_PUBLIC_URL')
        .replace(/\/+$/, '');
      return `${publicUrl}/${key}`;
    }

    const destination = join(process.cwd(), 'uploads', subdir);
    await mkdir(destination, { recursive: true });
    await writeFile(join(destination, filename), file.buffer);
    return `/uploads/${subdir}/${filename}`;
  }

  protected createS3Client(): S3Client {
    return new S3Client({
      endpoint: this.config.getOrThrow<string>('SUPABASE_STORAGE_ENDPOINT'),
      region: this.config.getOrThrow<string>('SUPABASE_STORAGE_REGION'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>(
          'SUPABASE_STORAGE_ACCESS_KEY',
        ),
        secretAccessKey: this.config.getOrThrow<string>(
          'SUPABASE_STORAGE_SECRET_KEY',
        ),
      },
    });
  }

  private getUploadMode(): 'local' | 'supabase_s3' {
    const explicitMode = this.config.get<string>('UPLOAD_MODE');
    if (explicitMode === 'supabase_s3' || explicitMode === 'local') {
      return explicitMode;
    }

    const hasSupabaseConfig = [
      'SUPABASE_STORAGE_ENDPOINT',
      'SUPABASE_STORAGE_REGION',
      'SUPABASE_STORAGE_ACCESS_KEY',
      'SUPABASE_STORAGE_SECRET_KEY',
      'SUPABASE_STORAGE_BUCKET',
      'SUPABASE_STORAGE_PUBLIC_URL',
    ].every((name) => Boolean(this.config.get<string>(name)));

    return hasSupabaseConfig ? 'supabase_s3' : 'local';
  }
}
