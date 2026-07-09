import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CloudinaryGifsService } from './cloudinary-gifs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('cloudinary-gifs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cloudinary-gifs')
export class CloudinaryGifsController {
  constructor(private service: CloudinaryGifsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pastas de grupos musculares com GIFs' })
  listFolders() {
    return this.service.listFolders();
  }

  @Get(':folder')
  @ApiOperation({ summary: 'Listar GIFs dentro de um grupo muscular' })
  listFiles(@Param('folder') folder: string) {
    return this.service.listFiles(folder);
  }
}