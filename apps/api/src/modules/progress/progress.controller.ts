import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private service: ProgressService) {}

  @Get()
  @ApiOperation({ summary: 'Dados completos de progresso' })
  getProgress(@CurrentUser() user: any) {
    return this.service.getProgress(user.id);
  }

  @Get('charts')
  @ApiOperation({ summary: 'Dados para gráficos de evolução' })
  getCharts(@CurrentUser() user: any) {
    return this.service.getCharts(user.id);
  }

  @Post('measurements')
  @ApiOperation({ summary: 'Adicionar medida corporal' })
  addMeasurement(@CurrentUser() user: any, @Body() body: any) {
    return this.service.addMeasurement(user.id, body);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Adicionar foto de progresso' })
  addPhoto(@CurrentUser() user: any, @Body() body: { photoUrl: string; angle: string; weight?: number; notes?: string }) {
    return this.service.addPhoto(user.id, body);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Remover foto de progresso' })
  deletePhoto(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deletePhoto(user.id, id);
  }

  @Post('assessments')
  @ApiOperation({ summary: 'Adicionar avaliação física (trainer)' })
  addAssessment(@CurrentUser() user: any, @Body() body: any) {
    return this.service.addAssessment(body.studentUserId, user.id, body);
  }

  @Get('trainer/student/:userId/measurements')
  @ApiOperation({ summary: 'Dados de progresso do aluno (visão do trainer)' })
  getStudentData(@Param('userId') userId: string) {
    return this.service.getStudentData(userId);
  }

  // ═══════════════════════════════════════════════
  // AI INSIGHTS
  // ═══════════════════════════════════════════════

  @Post('insights/:studentUserId')
  @ApiOperation({ summary: 'Gerar insights de evolução do aluno via IA' })
  generateInsights(
    @CurrentUser() user: any,
    @Param('studentUserId') studentUserId: string,
  ) {
    return this.service.generateInsights(studentUserId, user.id);
  }

  // ═══════════════════════════════════════════════
  // TRAINER GOALS
  // ═══════════════════════════════════════════════

  @Get('trainer-goals/:studentUserId')
  @ApiOperation({ summary: 'Metas do trainer para o aluno' })
  getTrainerGoals(
    @CurrentUser() user: any,
    @Param('studentUserId') studentUserId: string,
  ) {
    return this.service.getTrainerGoals(user.id, studentUserId);
  }

  @Post('trainer-goals')
  @ApiOperation({ summary: 'Criar meta para o aluno' })
  createTrainerGoal(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createTrainerGoal(user.id, body);
  }

  @Patch('trainer-goals/:id')
  @ApiOperation({ summary: 'Atualizar meta do aluno' })
  updateTrainerGoal(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateTrainerGoal(user.id, id, body);
  }

  @Delete('trainer-goals/:id')
  @ApiOperation({ summary: 'Remover meta do aluno' })
  deleteTrainerGoal(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteTrainerGoal(user.id, id);
  }

  // ═══════════════════════════════════════════════
  // EXERCISE EVOLUTION
  // ═══════════════════════════════════════════════

  @Get('exercise-evolution/:studentUserId')
  @ApiOperation({ summary: 'Evolução de carga/reps por exercício' })
  getExerciseEvolution(@Param('studentUserId') studentUserId: string) {
    return this.service.getExerciseEvolution(studentUserId);
  }

  // ═══════════════════════════════════════════════
  // REQUEST CHECK-IN
  // ═══════════════════════════════════════════════

  @Post('request-checkin/:studentUserId')
  @ApiOperation({ summary: 'Solicitar check-in rápido do aluno' })
  requestCheckin(
    @CurrentUser() user: any,
    @Param('studentUserId') studentUserId: string,
  ) {
    return this.service.requestCheckin(user.id, studentUserId);
  }
}
