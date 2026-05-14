import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private service: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar exercícios públicos e próprios' })
  findAll(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(user.id, user.tenantId, category, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar exercício por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar exercício (trainer)' })
  create(@CurrentUser() user: any, @Body() body: any) {
    return this.service.create(user.id, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar exercício' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover exercício' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
