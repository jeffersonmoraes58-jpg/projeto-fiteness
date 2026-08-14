import { Controller, Post, Get, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OwnVideosSyncService } from './own-videos-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('own-videos-sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exercises/sync-own-videos')
export class OwnVideosSyncController {
  constructor(private service: OwnVideosSyncService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Importar vídeos próprios do Cloudinary como exercícios (admin)' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean, description: 'Apenas simular, não gravar' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limitar número de arquivos a processar' })
  async sync(
    @Query('dryRun') dryRun?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.importVideos({
      dryRun: dryRun === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('clean-musclewiki')
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remover exercícios MuscleWiki do banco (admin)' })
  @ApiQuery({ name: 'dryRun', required: false, type: Boolean, description: 'Apenas simular, não gravar' })
  async clean(@Query('dryRun') dryRun?: string) {
    return this.service.removeMuscleWiki({ dryRun: dryRun === 'true' });
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Estatísticas de vídeos próprios vs MuscleWiki' })
  async stats() {
    return this.service.getStats();
  }
}
