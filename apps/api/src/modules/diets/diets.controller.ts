import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DietsService } from './diets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('diets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('diets')
export class DietsController {
  constructor(private service: DietsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar dietas do nutricionista' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar dieta por ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar dieta' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dieta' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover dieta' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Atribuir dieta a um aluno' })
  assign(@CurrentUser() user: any, @Param('id') id: string, @Body() body: { studentUserId: string }) {
    return this.service.assignToStudent(user.id, id, body.studentUserId);
  }

  @Delete('plans/:planId')
  @ApiOperation({ summary: 'Remover plano de dieta do paciente' })
  removePlan(@Param('planId') planId: string) {
    return this.service.removePlan(planId);
  }
}
