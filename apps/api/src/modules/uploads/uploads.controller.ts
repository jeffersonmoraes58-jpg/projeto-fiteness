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
const ALLOWED_TYPES = /^image\/(jpeg|png|webp|gif)$/;

function fileFilter(_req: any, file: Express.Multer.File, cb: any) {
  if (ALLOWED_TYPES.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Apenas imagens são permitidas (jpeg, png, webp, gif)'), false);
}

const upload = { storage: memoryStorage(), limits: { fileSize: MAX_SIZE }, fileFilter };

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

  @Delete(':publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    await this.service.deleteFile(publicId);
    return { deleted: true };
  }
}
