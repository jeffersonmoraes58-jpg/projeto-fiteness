import { Controller, Post, Get, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MuscleWikiSyncService } from './musclewiki-sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';

@ApiTags('musclewiki-sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('musclewiki/sync')
export class MuscleWikiSyncController {
  constructor(private service: MuscleWikiSyncService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sincronizar exercícios da MuscleWiki (admin)' })
  @ApiQuery({ name: 'clean', required: false, type: Boolean, description: 'Limpar exercícios existentes antes de importar' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limitar número de exercícios a importar' })
  async sync(
    @Query('clean') clean?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.syncExercises({
      clean: clean === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stats')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Estatísticas dos exercícios sincronizados' })
  async stats() {
    return this.service.getStats();
  }
}
