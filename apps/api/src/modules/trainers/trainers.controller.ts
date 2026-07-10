import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TrainersService } from './trainers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('trainers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainers')
export class TrainersController {
  constructor(private service: TrainersService) {}

  @Get('me/dashboard')
  @ApiOperation({ summary: 'Dashboard do trainer' })
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboard(user.id);
  }

  @Get('me/students')
  @ApiOperation({ summary: 'Listar alunos do trainer' })
  getStudents(@CurrentUser() user: any, @Query('search') search?: string) {
    return this.service.getStudents(user.id, search);
  }

  @Post('me/students')
  @ApiOperation({ summary: 'Adicionar aluno ao trainer' })
  addStudent(@CurrentUser() user: any, @Body() body: { studentUserId: string; monthlyFee?: number }) {
    return this.service.addStudent(user.id, body.studentUserId, body.monthlyFee);
  }

  @Delete('me/students/:studentId')
  @ApiOperation({ summary: 'Remover aluno do trainer' })
  removeStudent(@CurrentUser() user: any, @Param('studentId') studentId: string) {
    return this.service.removeStudent(user.id, studentId);
  }

  @Get('me/appointments')
  @ApiOperation({ summary: 'Listar agendamentos' })
  getAppointments(@CurrentUser() user: any) {
    return this.service.getAppointments(user.id);
  }

  @Post('me/appointments')
  @ApiOperation({ summary: 'Criar agendamento' })
  createAppointment(@CurrentUser() user: any, @Body() body: any) {
    return this.service.createAppointment(user.id, body);
  }

  @Patch('me/appointments/:id')
  @ApiOperation({ summary: 'Atualizar agendamento' })
  updateAppointment(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateAppointment(user.id, id, body);
  }

  @Delete('me/appointments/:id')
  @ApiOperation({ summary: 'Cancelar agendamento' })
  deleteAppointment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.deleteAppointment(user.id, id);
  }

  @Get('me/reports')
  @ApiOperation({ summary: 'Relatórios por período' })
  getReports(@CurrentUser() user: any, @Query('days') days?: string) {
    return this.service.getReports(user.id, days ? Number(days) : 30);
  }

  @Get('me/payments')
  @ApiOperation({ summary: 'Pagamentos e MRR' })
  getPayments(@CurrentUser() user: any) {
    return this.service.getPayments(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil do trainer' })
  update(@CurrentUser() user: any, @Body() body: any) {
    return this.service.update(user.id, body);
  }

  @Post('me/students/:studentUserId/send-anamnese-link')
  @ApiOperation({ summary: 'Enviar link da anamnese por email para o aluno' })
  sendAnamneseLink(@CurrentUser() user: any, @Param('studentUserId') studentUserId: string) {
    return this.service.sendAnamneseLink(user.id, studentUserId);
  }

  @Get('me/analytics')
  @ApiOperation({ summary: 'Analytics de engajamento do trainer' })
  getAnalytics(@CurrentUser() user: any) {
    return this.service.getAnalytics(user.id);
  }
}
