import {
  Controller, Post, UploadedFile, UseGuards,
  UseInterceptors, BadRequestException, Delete, Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_SIZE_200MB = 200 * 1024 * 1024;
const MAX_SIZE_100MB = 100 * 1024 * 1024;
const MAX_SIZE_500MB = 500 * 1024 * 1024;
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|gif)$/;
const ALLOWED_DOC_TYPES = /^image\/(jpeg|png|webp|gif)$|^application\/pdf$/;
const ALLOWED_VIDEO_TYPES = /^video\/(mp4|webm|ogg|quicktime|x-msvideo|x-matroska)$/;

function fileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_TYPES.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Apenas imagens são permitidas (jpeg, png, webp, gif)'), false);
}

function docFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_DOC_TYPES.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Apenas imagens (jpeg, png, webp, gif) e PDF são permitidos'), false);
}

function videoFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_VIDEO_TYPES.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Apenas vídeos são permitidos (mp4, webm, mov, avi, mkv)'), false);
}

function allowAllFilter(_req: any, _file: Express.Multer.File, cb: any) {
  cb(null, true);
}

const upload = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE }, fileFilter };
const uploadDoc = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE }, fileFilter: docFilter };
const uploadVideo = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE_500MB }, fileFilter: videoFilter };
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
  @UseInterceptors(FileInterceptor('file', uploadDoc))
  async uploadDocument(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    return this.service.uploadFile(file.buffer, file.originalname, 'documents');
  }

  @Post('exercise-video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', uploadVideo))
  async uploadExerciseVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const result = await this.service.uploadFileRaw(file.buffer, file.originalname, 'exercise-videos');
    return {
      url: result.secure_url,
      publicId: result.public_id,
      duration: (result as any).duration ?? null,
      size: result.bytes,
    };
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

  @Post('chat')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: allowAllFilter,
  }))
  async uploadChatFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    const result = await this.service.uploadFileRaw(file.buffer, file.originalname, 'chat-files');
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: result.bytes,
    };
  }

  @Delete(':publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    await this.service.deleteFile(publicId);
    return { deleted: true };
  }
}
