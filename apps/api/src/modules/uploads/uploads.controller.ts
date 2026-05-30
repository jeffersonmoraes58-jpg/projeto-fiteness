import {
  Controller, Post, UploadedFile, UseGuards,
  UseInterceptors, BadRequestException, Delete, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_SIZE_200MB = 200 * 1024 * 1024;
const MAX_SIZE_100MB = 100 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|gif)$/;

function fileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_TYPES.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Apenas imagens são permitidas (jpeg, png, webp, gif)'), false);
}

function allowAllFilter(_req: any, _file: Express.Multer.File, cb: any) {
  cb(null, true);
}

const upload = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE }, fileFilter };
const uploadLessonContent = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE_200MB }, fileFilter: allowAllFilter };
const uploadLessonAttachment = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE_100MB }, fileFilter: allowAllFilter };

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private service: UploadsService) {}

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', upload))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.uploadFile(file.buffer, file.originalname, 'avatars');
  }

  @Post('progress-photo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', upload))
  async uploadProgressPhoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.uploadFile(file.buffer, file.originalname, 'progress-photos');
  }

  @Post('document')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', upload))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.uploadFile(file.buffer, file.originalname, 'documents');
  }

  @Post('challenge-cover')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', upload))
  async uploadChallengeCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.uploadFile(file.buffer, file.originalname, 'challenge-covers');
  }

  @Post('lesson-content')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadLessonContent))
  async uploadLessonContent(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const result = await this.service.uploadFileRaw(file.buffer, file.originalname, 'lesson-content');
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      size: result.bytes,
      duration: (result as any).duration ?? null,
    };
  }

  @Post('lesson-attachment')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadLessonAttachment))
  async uploadLessonAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const result = await this.service.uploadFileRaw(file.buffer, file.originalname, 'lesson-attachments');
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      size: result.bytes,
      duration: (result as any).duration ?? null,
    };
  }

  @Delete(':publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    await this.service.deleteFile(publicId);
    return { deleted: true };
  }
}
