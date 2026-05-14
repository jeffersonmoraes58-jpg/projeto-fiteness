import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private service: ChallengesService) {}

  @Get('available')
  @ApiOperation({ summary: 'Desafios disponíveis para participar' })
  findAvailable(@CurrentUser() user: any) {
    return this.service.findAvailable(user.id, user.tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Desafios em andamento' })
  findActive(@CurrentUser() user: any) {
    return this.service.findActive(user.id);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Desafios concluídos' })
  findCompleted(@CurrentUser() user: any) {
    return this.service.findCompleted(user.id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Entrar em um desafio' })
  join(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.join(user.id, id);
  }

  @Post(':id/progress')
  @ApiOperation({ summary: 'Atualizar progresso no desafio' })
  updateProgress(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { progress: number }) {
    return this.service.updateProgress(user.id, id, body.progress);
  }
}
