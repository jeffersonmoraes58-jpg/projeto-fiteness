import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export type UploadFolder = 'avatars' | 'progress-photos' | 'documents';

@Injectable()
export class UploadsService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    buffer: Buffer,
    originalname: string,
    folder: UploadFolder,
  ): Promise<{ url: string; publicId: string }> {
    const result = await this.uploadToCloudinary(buffer, folder);
    return { url: result.secure_url, publicId: result.public_id };
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  private uploadToCloudinary(
    buffer: Buffer,
    folder: UploadFolder,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `fitsaas/${folder}`,
            resource_type: 'auto',
            transformation:
              folder === 'avatars'
                ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
                : undefined,
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error('Upload failed'));
            resolve(result);
          },
        )
        .end(buffer);
    });
  }
}
