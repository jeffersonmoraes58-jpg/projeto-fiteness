import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
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
}
