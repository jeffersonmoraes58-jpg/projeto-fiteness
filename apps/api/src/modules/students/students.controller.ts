import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('students')
export class StudentsController {
  constructor(private service: StudentsService) {}

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Dashboard do aluno' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.id);
  }

  @Get('me/workout-plan')
  @ApiOperation({ summary: 'Plano de treino ativo' })
  getWorkoutPlan(@CurrentUser() user: any) {
    return this.service.getWorkoutPlan(user.id);
  }

  @Get('me/workout-logs')
  @ApiOperation({ summary: 'Histórico de treinos' })
  getWorkoutLogs(@CurrentUser() user: any) {
    return this.service.getWorkoutLogs(user.id);
  }

  @Post('me/workout-logs')
  @ApiOperation({ summary: 'Registrar treino concluído' })
  logWorkout(@CurrentUser() user: any, @Body() body: any) {
    return this.service.logWorkout(user.id, body);
  }

  @Get('me/diet')
  @ApiOperation({ summary: 'Plano de dieta ativo' })
  getDiet(@CurrentUser() user: any) {
    return this.service.getDietPlan(user.id);
  }

  @Post('me/water')
  @ApiOperation({ summary: 'Registrar consumo de água' })
  logWater(@CurrentUser() user: any, @Body() body: { amount: number }) {
    return this.service.logWater(user.id, body.amount);
  }

  @Get('me/water/today')
  @ApiOperation({ summary: 'Consumo de água hoje' })
  getWaterToday(@CurrentUser() user: any) {
    return this.service.getWaterToday(user.id);
  }

  @Get('me/progress')
  @ApiOperation({ summary: 'Dados de evolução e medidas' })
  getProgress(@CurrentUser() user: any) {
    return this.service.getProgress(user.id);
  }

  @Post('me/measurements')
  @ApiOperation({ summary: 'Adicionar medida corporal' })
  addMeasurement(@CurrentUser() user: any, @Body() body: any) {
    return this.service.addMeasurement(user.id, body);
  }

  @Get('me/achievements')
  @ApiOperation({ summary: 'Conquistas do aluno' })
  getAchievements(@CurrentUser() user: any) {
    return this.service.getAchievements(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do aluno' })
  update(@CurrentUser() user: any, @Body() body: any) {
    return this.service.update(user.id, body);
  }
}
