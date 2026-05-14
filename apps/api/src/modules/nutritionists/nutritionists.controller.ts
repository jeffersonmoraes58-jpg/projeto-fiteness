import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
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

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do nutricionista' })
  update(@CurrentUser() user: any, @Body() body: any) {
    return this.service.update(user.id, body);
  }
}
