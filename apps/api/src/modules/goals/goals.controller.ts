import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private service: GoalsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar metas do aluno' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar meta' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar meta' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(user.id, id, body);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Marcar meta como concluída (+50 pts)' })
  complete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.complete(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover meta' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
