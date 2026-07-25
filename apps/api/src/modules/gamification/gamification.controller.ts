import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard de gamificação do aluno (XP, nível, streak, conquistas)' })
  getDashboard(@CurrentUser('id') userId: string) {
    return this.gamificationService.getDashboard(userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Ranking entre alunos do mesmo personal trainer' })
  getLeaderboard(@CurrentUser('id') userId: string) {
    return this.gamificationService.getLeaderboard(userId);
  }

  @Get('xp-history')
  @ApiOperation({ summary: 'Histórico de XP ganho' })
  getXpHistory(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return this.gamificationService.getXpHistory(userId, limit ?? 30);
  }
}
