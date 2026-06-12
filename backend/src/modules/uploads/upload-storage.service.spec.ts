import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'fs/promises';
import { UploadStorageService } from './upload-storage.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

describe('UploadStorageService', () => {
  it('stores local images and returns a relative public path', async () => {
    const service = new UploadStorageService(new ConfigService({
      UPLOAD_MODE: 'local',
    }));
    const file = {
      originalname: 'profile.png',
      mimetype: 'image/png',
      buffer: Buffer.from('image-bytes'),
    } as Express.Multer.File;

    const url = await service.storeImage(file, 'avatars');

    expect(url).toMatch(/^\/uploads\/avatars\/[a-f0-9-]+\.png$/);
    expect(mkdir).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]uploads[\\/]avatars$/),
      { recursive: true },
    );
    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/[\\/]uploads[\\/]avatars[\\/][a-f0-9-]+\.png$/),
      file.buffer,
    );
  });

  it('uploads images to Supabase S3 and returns the configured public URL', async () => {
    const service = new UploadStorageService(new ConfigService({
      UPLOAD_MODE: 'supabase_s3',
      SUPABASE_STORAGE_ENDPOINT: 'https://storage.example.com/s3',
      SUPABASE_STORAGE_REGION: 'local',
      SUPABASE_STORAGE_ACCESS_KEY: 'access',
      SUPABASE_STORAGE_SECRET_KEY: 'secret',
      SUPABASE_STORAGE_BUCKET: 'jptaxi',
      SUPABASE_STORAGE_PUBLIC_URL: 'https://cdn.example.com/jptaxi',
    }));
    const send = jest.fn().mockResolvedValue({});
    jest.spyOn(service as never, 'createS3Client' as never)
      .mockReturnValue({ send } as never);
    const file = {
      originalname: 'license.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('image-bytes'),
    } as Express.Multer.File;

    const url = await service.storeImage(file, 'drivers/licenses');

    expect(url).toMatch(
      /^https:\/\/cdn\.example\.com\/jptaxi\/drivers\/licenses\/[a-f0-9-]+\.jpg$/,
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'jptaxi',
      Key: expect.stringMatching(
        /^drivers\/licenses\/[a-f0-9-]+\.jpg$/,
      ),
      Body: file.buffer,
      ContentType: 'image/jpeg',
    });
  });
});
