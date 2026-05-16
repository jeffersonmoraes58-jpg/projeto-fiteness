import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NutritionistsService } from './nutritionists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('nutritionists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutritionists')
export class NutritionistsController {
  constructor(private service: NutritionistsService) {}

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Dashboard do nutricionista' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.id);
  }

  @Get('me/patients')
  @ApiOperation({ summary: 'Listar pacientes' })
  getPatients(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.service.getPatients(user.id, search);
  }

  @Post('me/patients')
  @ApiOperation({ summary: 'Adicionar paciente' })
  addPatient(@CurrentUser() user: any, @Body() body: { studentUserId: string; monthlyFee?: number }) {
    return this.service.addPatient(user.id, body.studentUserId, body.monthlyFee);
  }

  @Get('me/consultations')
  @ApiOperation({ summary: 'Listar consultas nutricionais' })
  getConsultations(@CurrentUser() user: any) {
    return this.service.getConsultations(user.id);
  }

  @Post('me/consultations')
  @ApiOperation({ summary: 'Criar consulta nutricional' })
  createConsultation(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createConsultation(user.id, body);
  }

  @Get('me/foods')
  @ApiOperation({ summary: 'Base de alimentos' })
  getFoodDatabase(
    @CurrentUser() user: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.service.getFoodDatabase(user.id, search, category);
  }

  @Post('me/foods')
  @ApiOperation({ summary: 'Adicionar alimento à base' })
  addFood(@CurrentUser() user: any, @Body() body: any) {
    return this.service.addFood(user.id, body);
  }

  @Get('me/reports')
  @ApiOperation({ summary: 'Relatórios dos últimos 30 dias' })
  getReports(@CurrentUser() user: any) {
    return this.service.getReports(user.id);
  }

  @Get('me/patients/:studentId/anamnesis')
  @ApiOperation({ summary: 'Buscar anamnese do paciente' })
  getAnamnesis(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getAnamnesis(user.id, studentId);
  }

  @Put('me/patients/:studentId/anamnesis')
  @ApiOperation({ summary: 'Criar ou atualizar anamnese do paciente' })
  upsertAnamnesis(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.upsertAnamnesis(user.id, studentId, body);
  }

  @Get('me/patients/:studentId/nutritional-assessments')
  @ApiOperation({ summary: 'Listar avaliações nutricionais do paciente' })
  getNutritionalAssessments(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getNutritionalAssessments(user.id, studentId);
  }

  @Post('me/patients/:studentId/nutritional-assessments')
  @ApiOperation({ summary: 'Criar avaliação nutricional do paciente' })
  createNutritionalAssessment(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.createNutritionalAssessment(user.id, studentId, body);
  }

  @Get('me/patients/:studentId/physical-assessments')
  @ApiOperation({ summary: 'Listar avaliações antropométricas do paciente' })
  getPhysicalAssessments(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getPhysicalAssessments(user.id, studentId);
  }

  @Post('me/patients/:studentId/physical-assessments')
  @ApiOperation({ summary: 'Criar avaliação antropométrica do paciente' })
  createPhysicalAssessment(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.createPhysicalAssessment(user.id, studentId, body);
  }

  @Get('me/patients/:studentId/goals')
  @ApiOperation({ summary: 'Listar metas do paciente' })
  getPatientGoals(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getPatientGoals(user.id, studentId);
  }

  @Post('me/patients/:studentId/goals')
  @ApiOperation({ summary: 'Criar meta do paciente' })
  createPatientGoal(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.createPatientGoal(user.id, studentId, body);
  }

  @Patch('me/goals/:goalId')
  @ApiOperation({ summary: 'Atualizar meta do paciente' })
  updatePatientGoal(@CurrentUser() user: any, @Param('goalId') goalId: string, @Body() body: any) {
    return this.service.updatePatientGoal(user.id, goalId, body);
  }

  @Delete('me/goals/:goalId')
  @ApiOperation({ summary: 'Excluir meta do paciente' })
  deletePatientGoal(@CurrentUser() user: any, @Param('goalId') goalId: string) {
    return this.service.deletePatientGoal(user.id, goalId);
  }

  @Get('me/patients/:studentId/progress-photos')
  @ApiOperation({ summary: 'Listar fotos de progresso do paciente' })
  getProgressPhotos(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getProgressPhotos(user.id, studentId);
  }

  @Post('me/patients/:studentId/progress-photos')
  @ApiOperation({ summary: 'Registrar foto de progresso do paciente' })
  addProgressPhoto(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.addProgressPhoto(user.id, studentId, body);
  }

  @Delete('me/patients/:studentId/progress-photos/:photoId')
  @ApiOperation({ summary: 'Excluir foto de progresso' })
  deleteProgressPhoto(@CurrentUser() user: any, @Param('studentId') studentId: string, @Param('photoId') photoId: string) {
    return this.service.deleteProgressPhoto(user.id, studentId, photoId);
  }

  @Get('me/patients/:studentId/weight-log')
  @ApiOperation({ summary: 'Histórico de peso diário do paciente' })
  getDailyWeightLog(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getDailyWeightLog(user.id, studentId);
  }

  @Post('me/patients/:studentId/weight-log')
  @ApiOperation({ summary: 'Registrar peso diário do paciente' })
  addDailyWeight(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.addDailyWeight(user.id, studentId, body);
  }

  @Get('me/patients/:studentId/evolution')
  @ApiOperation({ summary: 'Evolução do paciente ao longo do tempo' })
  getPatientEvolution(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getPatientEvolution(user.id, studentId);
  }

  @Get('me/patients/:studentId/consultations')
  @ApiOperation({ summary: 'Listar consultas do paciente' })
  getPatientConsultations(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getPatientConsultations(user.id, studentId);
  }

  @Post('me/patients/:studentId/consultations')
  @ApiOperation({ summary: 'Registrar consulta do paciente' })
  createPatientConsultation(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.createPatientConsultation(user.id, studentId, body);
  }

  @Patch('me/consultations/:consultationId')
  @ApiOperation({ summary: 'Atualizar consulta' })
  updateConsultation(@CurrentUser() user: any, @Param('consultationId') consultationId: string, @Body() body: any) {
    return this.service.updateConsultation(user.id, consultationId, body);
  }

  @Get('me/patients/:studentId/supplementation-plans')
  @ApiOperation({ summary: 'Listar planos de suplementação do paciente' })
  getSupplementationPlans(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.getSupplementationPlans(user.id, studentId);
  }

  @Post('me/patients/:studentId/supplementation-plans')
  @ApiOperation({ summary: 'Criar plano de suplementação' })
  createSupplementationPlan(@CurrentUser() user: any, @Param('studentId') studentId: string, @Body() body: any) {
    return this.service.createSupplementationPlan(user.id, studentId, body);
  }

  @Patch('me/supplementation-plans/:planId')
  @ApiOperation({ summary: 'Atualizar plano de suplementação' })
  updateSupplementationPlan(@CurrentUser() user: any, @Param('planId') planId: string, @Body() body: any) {
    return this.service.updateSupplementationPlan(user.id, planId, body);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do nutricionista' })
  update(@CurrentUser() user: any, @Body() body: any) {
    return this.service.update(user.id, body);
  }
}
